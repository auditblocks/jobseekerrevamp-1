import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check subscription tier (PRO or PRO_MAX required)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile.subscription_tier === "FREE") {
      return new Response(
        JSON.stringify({ error: "Resume Optimizer is available for PRO and PRO_MAX subscribers only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const resumeName = formData.get("name") as string || `Resume ${new Date().toISOString()}`;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Only PDF, DOCX, and TXT files are allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine file type
    let fileType: "pdf" | "docx" | "txt";
    if (file.type === "application/pdf") {
      fileType = "pdf";
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      fileType = "docx";
    } else {
      fileType = "txt";
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const fileArrayBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(fileName, fileArrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload file", details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("resumes")
      .getPublicUrl(fileName);

    // Extract text from file (basic extraction for now)
    let extractedText = "";
    try {
      if (fileType === "txt") {
        extractedText = await file.text();
      } else if (fileType === "pdf") {
        // For PDF, we'll extract text in the analyze-resume function
        // For now, store empty and extract during analysis
        extractedText = "";
      } else if (fileType === "docx") {
        // For DOCX, we'll extract text in the analyze-resume function
        // For now, store empty and extract during analysis
        extractedText = "";
      }
    } catch (extractError) {
      console.error("Text extraction error:", extractError);
      // Continue without extracted text - will extract during analysis
    }

    // Set other resumes as inactive if this is set as active
    const setAsActive = formData.get("setAsActive") === "true";
    if (setAsActive) {
      await supabase
        .from("resumes")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Dummy condition to update all
    }

    // Create resume record in database
    const { data: resumeData, error: dbError } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        name: resumeName,
        file_url: publicUrl,
        file_type: fileType,
        file_size: file.size,
        extracted_text: extractedText,
        is_active: setAsActive,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      // Clean up uploaded file
      await supabase.storage.from("resumes").remove([fileName]);
      return new Response(
        JSON.stringify({ error: "Failed to save resume record", details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        resume: {
          id: resumeData.id,
          name: resumeData.name,
          file_url: resumeData.file_url,
          file_type: resumeData.file_type,
          file_size: resumeData.file_size,
          is_active: resumeData.is_active,
          created_at: resumeData.created_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    const errorMessage = error?.message || error?.toString() || "Unknown error";
    console.error("Error details:", {
      message: errorMessage,
      stack: error?.stack,
      name: error?.name,
    });
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


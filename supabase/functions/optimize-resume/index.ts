import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OptimizeRequest {
  original_resume_text: string;
  suggestions: Array<{
    category: string;
    priority: string;
    suggestion: string;
    action: string;
    keyword?: string;
    where_to_add?: string;
  }>;
  job_description?: string;
  analysis_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { original_resume_text, suggestions, job_description, analysis_id }: OptimizeRequest = await req.json();

    if (!original_resume_text || !suggestions || suggestions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: original_resume_text, suggestions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify analysis belongs to user
    const { data: analysis, error: analysisError } = await supabase
      .from("resume_analyses")
      .select("*")
      .eq("id", analysis_id)
      .eq("user_id", user.id)
      .single();

    if (analysisError || !analysis) {
      return new Response(
        JSON.stringify({ error: "Analysis not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Google Gemini
    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "Google Gemini API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Build optimization prompt
    let optimizePrompt = `You are a professional resume optimizer. Apply the following suggestions to improve this resume while maintaining its authenticity and professional tone.

ORIGINAL RESUME:
${original_resume_text}

SUGGESTIONS TO APPLY:
${suggestions.map((s, idx) => `${idx + 1}. [${s.category.toUpperCase()}] ${s.suggestion}${s.keyword ? ` - Add keyword: "${s.keyword}"${s.where_to_add ? ` in ${s.where_to_add}` : ''}` : ''}`).join('\n')}

${job_description ? `\nTARGET JOB DESCRIPTION:\n${job_description}\n` : ''}

INSTRUCTIONS:
1. Apply ALL the suggestions listed above
2. Maintain the original structure and formatting style
3. Keep all existing information - only enhance, don't remove
4. Add missing keywords naturally into appropriate sections
5. Fix formatting issues while preserving readability
6. Improve content based on suggestions without changing the core message
7. Ensure the resume remains professional and authentic

IMPORTANT: Return ONLY the optimized resume text. Do not include explanations, markdown formatting, or any text outside the resume content itself.`;

    // Call Gemini API
    try {
      const result = await model.generateContent(optimizePrompt);
      const response = await result.response;
      let optimizedText = response.text().trim();

      // Clean up the response (remove markdown code blocks if present)
      if (optimizedText.startsWith("```")) {
        optimizedText = optimizedText.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
      }

      // Store optimized version in analysis
      const { error: updateError } = await supabase
        .from("resume_analyses")
        .update({
          analysis_result: {
            ...(analysis.analysis_result || {}),
            optimized_resume_text: optimizedText,
            applied_suggestions: suggestions,
            optimized_at: new Date().toISOString(),
          },
        })
        .eq("id", analysis_id);

      if (updateError) {
        console.error("Error saving optimized resume:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to save optimized resume", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          optimized_resume_text: optimizedText,
          applied_suggestions_count: suggestions.length,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (geminiError: any) {
      console.error("Gemini API error:", geminiError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to optimize resume", 
          details: geminiError.message || "AI optimization failed" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


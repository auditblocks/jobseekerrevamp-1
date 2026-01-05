import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

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

    let requestData: OptimizeRequest;
    try {
      requestData = await req.json();
    } catch (parseError: any) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { original_resume_text, suggestions, job_description, analysis_id } = requestData;

    if (!original_resume_text || !suggestions || suggestions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: original_resume_text, suggestions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize text to avoid Unicode escape sequence issues
    const sanitizeText = (text: string): string => {
      if (!text) return text;
      return text
        .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
          try {
            return String.fromCharCode(parseInt(hex, 16));
          } catch {
            return '';
          }
        })
        .replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => {
          try {
            return String.fromCharCode(parseInt(hex, 16));
          } catch {
            return '';
          }
        });
    };

    const sanitizedResumeText = sanitizeText(original_resume_text);
    const sanitizedJobDescription = job_description ? sanitizeText(job_description) : undefined;

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
    
    // Helper function to try generating content with different models
    const tryGenerateContent = async (prompt: string) => {
      const modelNames = ["gemini-2.0-flash-exp", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-pro"];
      
      for (const modelName of modelNames) {
        try {
          console.log(`Trying model: ${modelName}`);
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          console.log(`Successfully used model: ${modelName}`);
          return result;
        } catch (modelError: any) {
          console.log(`Model ${modelName} failed: ${modelError.message}`);
          // If it's not a 404, throw immediately (auth errors, etc.)
          if (!modelError.message?.includes("404") && !modelError.message?.includes("not found")) {
            throw modelError;
          }
          // Otherwise, try next model
          continue;
        }
      }
      throw new Error("All Gemini models failed. Please check your API key and available models in Google AI Studio.");
    };

    // Build optimization prompt
    let optimizePrompt = `You are a professional resume optimizer. Apply the following suggestions to improve this resume while maintaining its authenticity and professional tone.

ORIGINAL RESUME:
${sanitizedResumeText}

SUGGESTIONS TO APPLY:
${suggestions.map((s, idx) => `${idx + 1}. [${s.category.toUpperCase()}] ${s.suggestion}${s.keyword ? ` - Add keyword: "${s.keyword}"${s.where_to_add ? ` in ${s.where_to_add}` : ''}` : ''}`).join('\n')}

${sanitizedJobDescription ? `\nTARGET JOB DESCRIPTION:\n${sanitizedJobDescription}\n` : ''}

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
      const result = await tryGenerateContent(optimizePrompt);
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


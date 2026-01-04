import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  resume_text: string;
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

    // Parse request body ONCE at the beginning
    let requestData: AnalyzeRequest;
    try {
      requestData = await req.json();
    } catch (parseError: any) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { resume_text, job_description, analysis_id } = requestData;

    if (!resume_text || !analysis_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: resume_text, analysis_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if analysis exists and belongs to user
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

    // Check payment status for FREE users
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const isProUser = profile?.subscription_tier === "PRO" || profile?.subscription_tier === "PRO_MAX";
    
    if (!isProUser && analysis.payment_status !== "completed") {
      return new Response(
        JSON.stringify({ error: "Payment required for FREE users" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { resume_text, job_description, analysis_id } = requestData;

    if (!resume_text || !analysis_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: resume_text, analysis_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize text to avoid Unicode escape sequence issues
    const sanitizeText = (text: string): string => {
      if (!text) return text;
      // Remove problematic Unicode escape sequences
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

    // Extract fields from already parsed requestData
    const sanitizedResumeText = sanitizeText(resume_text);
    const sanitizedJobDescription = job_description ? sanitizeText(job_description) : undefined;

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

    // Build structured JSON prompt
    let analysisPrompt = `Analyze this resume and provide a comprehensive ATS (Applicant Tracking System) compatibility assessment.

RESUME TEXT:
${sanitizedResumeText}

Please provide a detailed analysis in the following EXACT JSON format (respond ONLY with valid JSON, no markdown):
{
  "ats_score": <number 0-100>,
  "keyword_analysis": {
    "found_keywords": ["list of important keywords found"],
    "missing_keywords": ["list of important keywords missing"],
    "keyword_score": <number 0-100>
  },
  "formatting_issues": [
    {
      "issue": "description of formatting problem",
      "severity": "high|medium|low",
      "recommendation": "how to fix it"
    }
  ],
  "content_strengths": ["list of resume strengths"],
  "content_improvements": [
    {
      "area": "section or aspect name",
      "current_state": "what's currently there",
      "suggestion": "how to improve",
      "priority": "high|medium|low"
    }
  ],
  "section_checks": {
    "contact_info": {"present": true/false, "score": <number 0-100>, "issues": []},
    "summary": {"present": true/false, "score": <number 0-100>, "issues": []},
    "experience": {"present": true/false, "score": <number 0-100>, "issues": []},
    "education": {"present": true/false, "score": <number 0-100>, "issues": []},
    "skills": {"present": true/false, "score": <number 0-100>, "issues": []}
  },
  "action_items": [
    {
      "priority": 1,
      "action": "specific actionable item",
      "category": "formatting|keywords|content|sections",
      "impact": "expected ATS score improvement"
    }
  ]
}`;

    // If job description provided, add matching analysis
    if (job_description && job_description.trim().length > 0) {
      analysisPrompt += `

JOB DESCRIPTION:
${sanitizedJobDescription}

Additionally, compare the resume against the job description and update the keyword_analysis section with:
{
  "keyword_analysis": {
    "found_keywords": ["keywords from job description found in resume"],
    "missing_keywords": ["keywords from job description NOT found in resume"],
    "keyword_score": <number 0-100 based on match percentage>,
    "job_match_percentage": <number 0-100>
  },
  "job_specific_suggestions": [
    {
      "keyword": "specific keyword to add",
      "where_to_add": "section suggestion",
      "reason": "why this keyword is important for this job"
    }
  ]
}`;
    }

    analysisPrompt += `

IMPORTANT: Respond ONLY with valid JSON. Do not include markdown code blocks, explanations, or any text outside the JSON object.`;

    // Call Gemini API
    try {
      const result = await model.generateContent(analysisPrompt);
      const response = await result.response;
      let analysisText = response.text().trim();

      // Parse JSON response (remove markdown code blocks if present)
      if (analysisText.startsWith("```json")) {
        analysisText = analysisText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      } else if (analysisText.startsWith("```")) {
        analysisText = analysisText.replace(/^```\n?/, "").replace(/\n?```$/, "");
      }

      const analysisResult = JSON.parse(analysisText);

      // Extract scores
      const atsScore = analysisResult.ats_score || 0;
      const keywordScore = analysisResult.keyword_analysis?.keyword_score || 0;
      const formattingScore = 100 - (analysisResult.formatting_issues?.length || 0) * 10;
      const contentScore = analysisResult.content_strengths?.length > 0 ? 70 : 50;

      // Update analysis in database
      const { data: updatedAnalysis, error: updateError } = await supabase
        .from("resume_analyses")
        .update({
          ats_score: atsScore,
          analysis_result: analysisResult,
          keyword_match_score: keywordScore,
          analysis_data: {
            formatting_score: Math.max(0, Math.min(100, formattingScore)),
            content_score: Math.max(0, Math.min(100, contentScore)),
            keyword_score: keywordScore,
          },
          missing_keywords: analysisResult.keyword_analysis?.missing_keywords || [],
          matched_keywords: analysisResult.keyword_analysis?.found_keywords || [],
        })
        .eq("id", analysis_id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating analysis:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to save analysis", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          analysis: {
            id: updatedAnalysis.id,
            ats_score: updatedAnalysis.ats_score,
            analysis_result: updatedAnalysis.analysis_result,
            keyword_match_score: updatedAnalysis.keyword_match_score,
            missing_keywords: updatedAnalysis.missing_keywords,
            matched_keywords: updatedAnalysis.matched_keywords,
            created_at: updatedAnalysis.created_at,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (geminiError: any) {
      console.error("Gemini API error:", geminiError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to analyze resume", 
          details: geminiError.message || "Invalid JSON response from AI" 
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


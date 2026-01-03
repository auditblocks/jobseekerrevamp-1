import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  resume_id: string;
  job_description?: string;
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
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check subscription tier
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

    // Parse request
    const { resume_id, job_description }: AnalyzeRequest = await req.json();

    if (!resume_id) {
      return new Response(
        JSON.stringify({ error: "resume_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch resume
    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .select("*")
      .eq("id", resume_id)
      .eq("user_id", user.id)
      .single();

    if (resumeError || !resume) {
      return new Response(
        JSON.stringify({ error: "Resume not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get resume text (extract if not already extracted)
    let resumeText = resume.extracted_text || "";

    // If no extracted text, try to fetch from file URL
    if (!resumeText && resume.file_url) {
      try {
        const fileResponse = await fetch(resume.file_url);
        if (resume.file_type === "txt" && fileResponse.ok) {
          resumeText = await fileResponse.text();
        }
        // For PDF and DOCX, we'd need proper parsing libraries
        // For now, we'll use the text as-is or empty
      } catch (fetchError) {
        console.error("Error fetching resume file:", fetchError);
      }
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Could not extract text from resume. Please ensure the file is readable." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Build analysis prompt
    let analysisPrompt = `Analyze this resume and provide a comprehensive ATS (Applicant Tracking System) compatibility assessment.

RESUME TEXT:
${resumeText}

Please provide a detailed analysis in the following JSON format:
{
  "ats_score": <number 1-100>,
  "formatting_score": <number 1-25>,
  "keyword_score": <number 1-30>,
  "sections_score": <number 1-20>,
  "structure_score": <number 1-15>,
  "formatting_issues": ["list of formatting problems"],
  "missing_sections": ["list of missing critical sections"],
  "suggestions": [
    {
      "category": "formatting|keywords|sections|structure",
      "priority": "high|medium|low",
      "suggestion": "specific improvement recommendation",
      "impact": "how this will improve ATS score"
    }
  ],
  "strengths": ["list of resume strengths"],
  "weaknesses": ["list of resume weaknesses"]
}`;

    // If job description provided, add matching analysis
    let keywordMatchScore = null;
    let missingKeywords: string[] = [];
    let matchedKeywords: string[] = [];

    if (job_description && job_description.trim().length > 0) {
      analysisPrompt += `

JOB DESCRIPTION:
${job_description}

Additionally, compare the resume against the job description and provide:
{
  "keyword_match_score": <number 1-100>,
  "missing_keywords": ["keywords from job description not found in resume"],
  "matched_keywords": ["keywords that appear in both resume and job description"],
  "skills_gap": ["skills mentioned in job description but missing from resume"],
  "job_match_suggestions": [
    {
      "keyword": "specific keyword to add",
      "where_to_add": "section suggestion",
      "reason": "why this keyword is important"
    }
  ]
}`;
    }

    analysisPrompt += `

Please respond ONLY with valid JSON. Do not include any markdown formatting or code blocks.`;

    // Call Gemini API
    try {
      const result = await model.generateContent(analysisPrompt);
      const response = await result.response;
      const analysisText = response.text();

      // Parse JSON response (remove markdown code blocks if present)
      let analysisJson = analysisText.trim();
      if (analysisJson.startsWith("```json")) {
        analysisJson = analysisJson.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      } else if (analysisJson.startsWith("```")) {
        analysisJson = analysisJson.replace(/^```\n?/, "").replace(/\n?```$/, "");
      }

      const analysis = JSON.parse(analysisJson);

      // Extract scores
      const atsScore = analysis.ats_score || 0;
      const keywordMatchScoreValue = analysis.keyword_match_score || null;
      const missingKeywordsArray = analysis.missing_keywords || [];
      const matchedKeywordsArray = analysis.matched_keywords || [];

      // Save analysis to database
      const { data: analysisData, error: analysisError } = await supabase
        .from("resume_analyses")
        .insert({
          resume_id: resume.id,
          user_id: user.id,
          job_description: job_description || null,
          ats_score: atsScore,
          keyword_match_score: keywordMatchScoreValue,
          analysis_data: analysis,
          suggestions: analysis.suggestions || [],
          missing_keywords: missingKeywordsArray,
          matched_keywords: matchedKeywordsArray,
        })
        .select()
        .single();

      if (analysisError) {
        console.error("Error saving analysis:", analysisError);
        return new Response(
          JSON.stringify({ error: "Failed to save analysis", details: analysisError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          analysis: {
            id: analysisData.id,
            ats_score: analysisData.ats_score,
            keyword_match_score: analysisData.keyword_match_score,
            suggestions: analysisData.suggestions,
            missing_keywords: analysisData.missing_keywords,
            matched_keywords: analysisData.matched_keywords,
            analysis_data: analysisData.analysis_data,
            created_at: analysisData.created_at,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (geminiError) {
      console.error("Gemini API error:", geminiError);
      return new Response(
        JSON.stringify({ error: "Failed to analyze resume", details: geminiError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
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


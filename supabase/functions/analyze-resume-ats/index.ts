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
    console.log("=== analyze-resume-ats function called ===");
    console.log("Method:", req.method);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables:", { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseServiceKey 
      });
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
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
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile", details: profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isProUser = profile?.subscription_tier === "PRO" || profile?.subscription_tier === "PRO_MAX";
    
    if (!isProUser && analysis.payment_status !== "completed") {
      return new Response(
        JSON.stringify({ error: "Payment required for FREE users" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const sanitizedResumeText = sanitizeText(resume_text);
    const sanitizedJobDescription = job_description ? sanitizeText(job_description) : undefined;

    // Initialize Google Gemini
    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("GOOGLE_GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Google Gemini API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Initializing Gemini API...");
    let genAI: GoogleGenerativeAI;
    let model: any;
    try {
      genAI = new GoogleGenerativeAI(geminiApiKey);
      model = genAI.getGenerativeModel({ model: "gemini-pro" });
      console.log("Gemini API initialized successfully");
    } catch (initError: any) {
      console.error("Error initializing Gemini API:", initError);
      return new Response(
        JSON.stringify({ error: "Failed to initialize AI service", details: initError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      console.log("Calling Gemini API...");
      console.log("Prompt length:", analysisPrompt.length);
      console.log("Resume text length:", sanitizedResumeText.length);
      
      const result = await model.generateContent(analysisPrompt);
      const response = await result.response;
      let analysisText = response.text().trim();
      
      console.log("Gemini response received, length:", analysisText.length);

      // Parse JSON response (remove markdown code blocks if present)
      if (analysisText.startsWith("```json")) {
        analysisText = analysisText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      } else if (analysisText.startsWith("```")) {
        analysisText = analysisText.replace(/^```\n?/, "").replace(/\n?```$/, "");
      }

      console.log("Parsing JSON response...");
      let analysisResult: any;
      try {
        analysisResult = JSON.parse(analysisText);
        console.log("JSON parsed successfully");
      } catch (parseError: any) {
        console.error("JSON parse error:", parseError);
        console.error("Response text (first 500 chars):", analysisText.substring(0, 500));
        throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
      }

      // Extract scores with validation
      const atsScore = typeof analysisResult.ats_score === 'number' ? analysisResult.ats_score : 0;
      const keywordScore = typeof analysisResult.keyword_analysis?.keyword_score === 'number' 
        ? analysisResult.keyword_analysis.keyword_score 
        : 0;
      const formattingScore = Math.max(0, Math.min(100, 100 - (analysisResult.formatting_issues?.length || 0) * 10));
      const contentScore = (analysisResult.content_strengths?.length > 0) ? 70 : 50;
      
      console.log("Scores extracted:", { atsScore, keywordScore, formattingScore, contentScore });

      // Update analysis in database
      console.log("Updating analysis in database...");
      const updateData = {
        ats_score: atsScore,
        analysis_result: analysisResult,
        keyword_match_score: keywordScore,
        analysis_data: {
          formatting_score: Math.max(0, Math.min(100, formattingScore)),
          content_score: Math.max(0, Math.min(100, contentScore)),
          keyword_score: keywordScore,
        },
        missing_keywords: Array.isArray(analysisResult.keyword_analysis?.missing_keywords) 
          ? analysisResult.keyword_analysis.missing_keywords 
          : [],
        matched_keywords: Array.isArray(analysisResult.keyword_analysis?.found_keywords) 
          ? analysisResult.keyword_analysis.found_keywords 
          : [],
      };
      
      console.log("Update data prepared:", {
        ats_score: updateData.ats_score,
        keyword_match_score: updateData.keyword_match_score,
        missing_keywords_count: updateData.missing_keywords.length,
        matched_keywords_count: updateData.matched_keywords.length,
      });
      
      const { data: updatedAnalysis, error: updateError } = await supabase
        .from("resume_analyses")
        .update(updateData)
        .eq("id", analysis_id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating analysis:", updateError);
        console.error("Update error details:", {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        });
        return new Response(
          JSON.stringify({ 
            error: "Failed to save analysis", 
            details: updateError.message,
            code: updateError.code,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!updatedAnalysis) {
        console.error("Updated analysis is null");
        return new Response(
          JSON.stringify({ error: "Analysis update returned no data" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Analysis updated successfully:", updatedAnalysis.id);
      return new Response(
        JSON.stringify({
          success: true,
          analysis: {
            id: updatedAnalysis.id,
            ats_score: updatedAnalysis.ats_score,
            analysis_result: updatedAnalysis.analysis_result,
            keyword_match_score: updatedAnalysis.keyword_match_score,
            missing_keywords: updatedAnalysis.missing_keywords || [],
            matched_keywords: updatedAnalysis.matched_keywords || [],
            created_at: updatedAnalysis.created_at,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (geminiError: any) {
      console.error("Gemini API error:", geminiError);
      console.error("Error stack:", geminiError.stack);
      console.error("Error name:", geminiError.name);
      return new Response(
        JSON.stringify({ 
          error: "Failed to analyze resume", 
          details: geminiError.message || "Invalid JSON response from AI",
          type: geminiError.name || "UnknownError",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("=== Top-level error ===");
    console.error("Error message:", error.message);
    console.error("Error name:", error.name);
    console.error("Error stack:", error.stack);
    console.error("Error type:", typeof error);
    console.error("Error keys:", Object.keys(error));
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message || "Unknown error occurred",
        type: error.name || "UnknownError",
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


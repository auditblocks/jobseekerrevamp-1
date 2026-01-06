import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  resume_text?: string;  // Fallback for text-only
  file_path?: string;   // Path in storage bucket
  file_url?: string;    // Public URL
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

    const { resume_text, file_path, file_url, job_description, analysis_id } = requestData;

    if (!analysis_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: analysis_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!resume_text && !file_path && !file_url) {
      return new Response(
        JSON.stringify({ error: "Missing required field: resume_text, file_path, or file_url" }),
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

    const sanitizedJobDescription = job_description ? sanitizeText(job_description) : undefined;

    // Helper function to prepare PDF for Vision API
    // Convert PDF buffer to base64 - Gemini Vision can analyze PDFs directly
    const preparePdfForVision = async (pdfBuffer: ArrayBuffer): Promise<string> => {
      try {
        // Convert PDF buffer to base64 (handle large files efficiently)
        const uint8Array = new Uint8Array(pdfBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);
        return base64;
      } catch (error: any) {
        console.error("PDF preparation error:", error);
        throw new Error(`Failed to prepare PDF: ${error.message}`);
      }
    };

    // Handle PDF file analysis
    let pdfBase64: string | null = null;
    let sanitizedResumeText: string | null = null;
    let isPdfAnalysis = false;

    if (file_path || file_url) {
      // Download PDF from storage
      try {
        let pdfBuffer: ArrayBuffer;
        
        if (file_path) {
          // Download from storage bucket
          const { data: fileData, error: downloadError } = await supabase.storage
            .from("resumes")
            .download(file_path);
          
          if (downloadError) throw downloadError;
          pdfBuffer = await fileData.arrayBuffer();
        } else if (file_url) {
          // Download from URL
          const response = await fetch(file_url);
          if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
          pdfBuffer = await response.arrayBuffer();
        } else {
          throw new Error("No file path or URL provided");
        }

        // Prepare PDF for Vision API
        console.log("Preparing PDF for Vision API...");
        pdfBase64 = await preparePdfForVision(pdfBuffer);
        console.log(`PDF prepared, size: ${pdfBase64.length} characters`);
        isPdfAnalysis = true;
      } catch (pdfError: any) {
        console.error("PDF processing error:", pdfError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to process PDF file", 
            details: pdfError.message 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (resume_text) {
      sanitizedResumeText = sanitizeText(resume_text);
    }

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
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    
    // Helper function to try generating content with different models (supports Vision API)
    const tryGenerateContent = async (prompt: any) => {
      // Use gemini-2.5-flash as primary (API key configured for this model)
      // Fallback to gemini-1.5-pro if gemini-2.5-flash fails
      const modelNames = ["gemini-2.5-flash", "gemini-1.5-pro"];
      
      for (const modelName of modelNames) {
        try {
          console.log(`Trying model: ${modelName}`);
          const model = genAI.getGenerativeModel({ model: modelName });
          
          // If prompt is array, it includes images (Vision API)
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

    // Build structured JSON prompt
    let analysisPrompt: any;
    
    if (isPdfAnalysis && pdfBase64) {
      // PDF Vision Analysis - analyze layout and formatting
      analysisPrompt = [
        `Analyze this resume PDF and provide a comprehensive ATS (Applicant Tracking System) compatibility assessment.

IMPORTANT: Analyze both the VISUAL LAYOUT and CONTENT of this resume. Pay attention to:
- Layout structure (two-column, single-column, sections arrangement)
- Formatting elements (colors, fonts, spacing, borders, styling)
- Visual hierarchy and design elements
- Content organization and structure

Please provide a detailed analysis in the following EXACT JSON format (respond ONLY with valid JSON, no markdown):
{
  "ats_score": <number 0-100>,
  "formatting_analysis": {
    "layout_type": "two-column|single-column|other",
    "sidebar_color": "<hex color if sidebar exists>",
    "font_family": "<detected font family>",
    "section_spacing": "tight|moderate|spacious",
    "design_style": "professional|creative|minimal|classic"
  },
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
  ],
  "formatting_preservation": {
    "sections": ["list of section names in order"],
    "styling": {
      "colors": ["<hex colors used>"],
      "fonts": ["<font families used>"],
      "layout": "<layout description>"
    }
  }
}`,
        {
          inlineData: {
            data: pdfBase64,
            mimeType: "application/pdf"
          }
        }
      ];
    } else {
      // Text-based analysis
      analysisPrompt = `Analyze this resume and provide a comprehensive ATS (Applicant Tracking System) compatibility assessment.

RESUME TEXT:
${sanitizedResumeText || ""}

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
    if (sanitizedJobDescription && sanitizedJobDescription.trim().length > 0) {
      const jobDescAddition = `

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

      if (isPdfAnalysis && Array.isArray(analysisPrompt)) {
        // For PDF analysis, update the first element (prompt text)
        const firstElement = analysisPrompt[0];
        if (typeof firstElement === 'string') {
          analysisPrompt[0] = firstElement + jobDescAddition;
        }
      } else if (typeof analysisPrompt === 'string') {
        analysisPrompt = analysisPrompt + jobDescAddition;
      }
    }

    // Add final instruction
    const finalInstruction = `

IMPORTANT: Respond ONLY with valid JSON. Do not include markdown code blocks, explanations, or any text outside the JSON object.`;
    
    if (isPdfAnalysis && Array.isArray(analysisPrompt)) {
      const firstElement = analysisPrompt[0];
      if (typeof firstElement === 'string') {
        analysisPrompt[0] = firstElement + finalInstruction;
      }
    } else if (typeof analysisPrompt === 'string') {
      analysisPrompt = analysisPrompt + finalInstruction;
    }

    // Call Gemini API
    try {
      console.log("Calling Gemini API...");
      if (isPdfAnalysis) {
        console.log("PDF analysis mode - analyzing PDF file with Vision API");
      } else {
        console.log("Text analysis mode - text length:", sanitizedResumeText?.length || 0);
      }
      
      const result = await tryGenerateContent(analysisPrompt);
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


import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  resume_id: string;
  job_description?: string;
}

serve(async (req) => {
  console.log("=== analyze-resume function called ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);

  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing analyze-resume request");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    console.log("Supabase URL:", supabaseUrl);
    console.log("Service key present:", !!supabaseServiceKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token
    console.log("Checking authorization header");
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Token extracted, length:", token.length);

    // Try to get user with the token
    console.log("Verifying user token");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError) {
      console.error("Auth error:", authError);
      console.error("Token length:", token.length);
      return new Response(
        JSON.stringify({
          error: "Invalid or expired token",
          details: authError.message,
          hint: "Please refresh your session and try again"
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!user) {
      console.error("No user found for token");
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

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
    console.log("Parsing request body");
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    console.log("Request method:", req.method);
    console.log("Content-Type:", req.headers.get("Content-Type"));

    let requestBody: AnalyzeRequest;
    try {
      requestBody = await req.json();
      console.log("Request body parsed successfully:", {
        resume_id: requestBody.resume_id,
        has_job_description: !!requestBody.job_description
      });
    } catch (parseError: any) {
      console.error("Error parsing request body:", parseError);
      console.error("Parse error details:", {
        message: parseError?.message,
        name: parseError?.name,
        stack: parseError?.stack
      });
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: parseError?.message || "Unknown error",
          hint: "Expected JSON format: { resume_id: string, job_description?: string }"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { resume_id, job_description } = requestBody;

    if (!resume_id) {
      console.error("Missing resume_id in request");
      return new Response(
        JSON.stringify({ error: "resume_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing analysis for resume_id:", resume_id);

    // Fetch resume from both tables (resumes and user_resumes)
    console.log("Fetching resume with ID:", resume_id);

    let resume: any = null;
    let resumeError: any = null;

    // First try the resumes table (Resume Optimizer)
    const { data: optimizerResume, error: optimizerError } = await supabase
      .from("resumes")
      .select("*")
      .eq("id", resume_id)
      .eq("user_id", user.id)
      .single();

    if (optimizerResume && !optimizerError) {
      resume = optimizerResume;
      console.log("Resume found in resumes table");
    } else {
      // If not found, try user_resumes table (Settings page)
      console.log("Resume not found in resumes table, checking user_resumes table");
      const { data: userResume, error: userResumeError } = await supabase
        .from("user_resumes")
        .select("*")
        .eq("id", resume_id)
        .eq("user_id", user.id)
        .single();

      if (userResume && !userResumeError) {
        // Convert user_resumes format to resumes format
        let fileType = "pdf";
        if (userResume.file_type) {
          if (userResume.file_type.includes("pdf")) {
            fileType = "pdf";
          } else if (userResume.file_type.includes("wordprocessingml") || userResume.file_type.includes("msword") || userResume.file_type.includes("docx")) {
            fileType = "docx";
          } else if (userResume.file_type.includes("text") || userResume.file_type.includes("txt")) {
            fileType = "txt";
          }
        }

        resume = {
          id: userResume.id,
          user_id: userResume.user_id,
          name: userResume.file_name || userResume.version_name || "Resume",
          file_url: userResume.file_url,
          file_type: fileType,
          file_size: userResume.file_size || 0,
          extracted_text: null, // user_resumes doesn't have extracted_text
          is_active: userResume.is_primary || false,
          created_at: userResume.created_at,
          updated_at: userResume.updated_at,
        };
        console.log("Resume found in user_resumes table, converted format");
      } else {
        resumeError = userResumeError || optimizerError;
        console.error("Resume not found in either table:", resumeError);
      }
    }

    if (resumeError || !resume) {
      console.error("Resume lookup failed:", resumeError);
      return new Response(
        JSON.stringify({
          error: "Resume not found",
          details: resumeError?.message || "The resume does not exist or you don't have access to it"
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Resume found:", { id: resume.id, name: resume.name, file_type: resume.file_type, has_extracted_text: !!resume.extracted_text });

    // Get resume text (extract if not already extracted)
    let resumeText = resume.extracted_text || "";
    console.log("Initial resume text length:", resumeText.length);

    // If no extracted text, fetch and extract from file
    if (!resumeText && resume.file_url) {
      console.log("No extracted text found, fetching file from URL:", resume.file_url);
      try {
        let fileBuffer: ArrayBuffer;

        // Try to extract file path from Supabase Storage URL
        // URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
        // or: https://[project].supabase.co/storage/v1/object/sign/[bucket]/[path]?token=...
        const urlParts = resume.file_url.split('/storage/v1/object/');
        if (urlParts.length > 1) {
          // This is a Supabase Storage URL - use storage client to download
          const pathAfterStorage = urlParts[1];
          const isPublic = pathAfterStorage.startsWith('public/');
          const isSigned = pathAfterStorage.startsWith('sign/');

          let bucketName = 'resumes';
          let filePath = '';

          if (isPublic) {
            const publicPath = pathAfterStorage.replace('public/', '');
            const pathParts = publicPath.split('/');
            bucketName = pathParts[0];
            filePath = pathParts.slice(1).join('/');
          } else if (isSigned) {
            // For signed URLs, extract path before the query string
            const signedPath = pathAfterStorage.replace('sign/', '').split('?')[0];
            const pathParts = signedPath.split('/');
            bucketName = pathParts[0];
            filePath = pathParts.slice(1).join('/');
          } else {
            // Fallback: try to extract from URL path
            const pathParts = pathAfterStorage.split('/');
            if (pathParts.length > 1) {
              bucketName = pathParts[0];
              filePath = pathParts.slice(1).join('/');
            }
          }

          console.log("Extracted storage path:", { bucketName, filePath });

          // Download using Supabase Storage client (works for both public and private)
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(filePath);

          if (downloadError || !fileData) {
            console.error("Storage download error:", downloadError);
            throw new Error(`Failed to download file from storage: ${downloadError?.message || 'Unknown error'}`);
          }

          fileBuffer = await fileData.arrayBuffer();
          console.log("File downloaded from storage, size:", fileBuffer.byteLength, "bytes");
        } else {
          // Not a Supabase Storage URL - try direct fetch (for external URLs)
          console.log("Not a Supabase Storage URL, trying direct fetch");
          const fileResponse = await fetch(resume.file_url);
          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
          }
          fileBuffer = await fileResponse.arrayBuffer();
          console.log("File fetched via HTTP, size:", fileBuffer.byteLength, "bytes");
        }

        if (resume.file_type === "txt") {
          resumeText = new TextDecoder().decode(fileBuffer);
          console.log("Extracted text from TXT file, length:", resumeText.length);
        } else if (resume.file_type === "pdf") {
          // Use pdfjs-dist for PDF text extraction
          console.log("Extracting text from PDF...");
          try {
            // Import pdfjs-dist using esm.sh which works better with Deno
            const pdfjsLib = await import("https://esm.sh/pdfjs-dist@3.11.174");

            // Check if getDocument is available
            const getDocument = pdfjsLib.getDocument || pdfjsLib.default?.getDocument;

            if (!getDocument || typeof getDocument !== 'function') {
              console.error("getDocument not found. Module keys:", Object.keys(pdfjsLib));
              // Try alternative: use the module's default export
              const pdfjs = pdfjsLib.default || pdfjsLib;
              const getDoc = pdfjs.getDocument;

              if (!getDoc || typeof getDoc !== 'function') {
                throw new Error("getDocument function not available in pdfjs-dist module");
              }

              // Load the PDF document
              const loadingTask = getDoc({
                data: new Uint8Array(fileBuffer),
                useSystemFonts: true,
              });
              const pdfDocument = await loadingTask.promise;
              console.log("PDF loaded, pages:", pdfDocument.numPages);

              // Extract text from all pages
              const textParts: string[] = [];
              for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
                const page = await pdfDocument.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                  .map((item: any) => item.str)
                  .join(" ");
                textParts.push(pageText);
                console.log(`Extracted text from page ${pageNum}, length:`, pageText.length);
              }

              resumeText = textParts.join("\n\n");
            } else {
              // Load the PDF document
              const loadingTask = getDocument({
                data: new Uint8Array(fileBuffer),
                useSystemFonts: true,
              });
              const pdfDocument = await loadingTask.promise;
              console.log("PDF loaded, pages:", pdfDocument.numPages);

              // Extract text from all pages
              const textParts: string[] = [];
              for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
                const page = await pdfDocument.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                  .map((item: any) => item.str)
                  .join(" ");
                textParts.push(pageText);
                console.log(`Extracted text from page ${pageNum}, length:`, pageText.length);
              }

              resumeText = textParts.join("\n\n");
            }

            console.log("Total extracted text length:", resumeText.length);

            // Update the resume record with extracted text if it's in the resumes table
            if (resume.source !== "user_resumes") {
              await supabase
                .from("resumes")
                .update({ extracted_text: resumeText })
                .eq("id", resume.id);
              console.log("Updated resume record with extracted text");
            }
          } catch (pdfError: any) {
            console.error("PDF extraction error:", pdfError);
            console.error("Error details:", {
              message: pdfError.message,
              stack: pdfError.stack,
              name: pdfError.name
            });
            throw new Error(`Failed to extract text from PDF: ${pdfError.message}`);
          }
        } else if (resume.file_type === "docx") {
          // For DOCX, we'll need a different library
          // For now, return an error suggesting to use PDF or TXT
          console.error("DOCX text extraction not yet implemented");
          throw new Error("DOCX text extraction is not yet supported. Please convert to PDF or TXT format.");
        }
      } catch (fetchError: any) {
        console.error("Error fetching/extracting resume file:", fetchError);
        return new Response(
          JSON.stringify({
            error: "Could not extract text from resume",
            details: fetchError.message || "Please ensure the file is readable and not corrupted"
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!resumeText || resumeText.trim().length === 0) {
      console.error("No text extracted from resume");
      return new Response(
        JSON.stringify({
          error: "Could not extract text from resume",
          details: "The resume file appears to be empty or unreadable. Please ensure the file contains text and is not corrupted."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Resume text ready for analysis, length:", resumeText.length);

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
      // Use gemini-2.0-flash as primary (gemini-1.5-flash is retired/404 in 2026)
      // Fallback to gemini-1.5-pro if needed
      const modelNames = ["gemini-2.0-flash"];

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
      const result = await tryGenerateContent(analysisPrompt);
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


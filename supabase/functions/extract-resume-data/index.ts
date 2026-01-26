import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractRequest {
  resume_text: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== extract-resume-data function called ===");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
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

    // Parse request body
    const requestData: ExtractRequest = await req.json();
    const { resume_text } = requestData;

    if (!resume_text || resume_text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "resume_text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Gemini API key
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY not found in environment");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    // Model names to try (in order of preference)
    const modelNames = [
      "gemini-2.0-flash-exp",
    ];

    const tryGenerateContent = async (prompt: string) => {
      let lastError: Error | null = null;

      for (const modelName of modelNames) {
        try {
          console.log(`Trying model: ${modelName}`);
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          return result;
        } catch (error: any) {
          console.error(`Error with model ${modelName}:`, error.message);
          lastError = error;
          // Continue to next model
        }
      }

      throw lastError || new Error("All models failed");
    };

    // Build extraction prompt with emphasis on preserving formatting
    const extractionPrompt = `Extract structured data from the following resume text. CRITICALLY IMPORTANT: Preserve the original formatting, structure, and professional presentation style of the resume.

Resume Text:
${resume_text}

Please extract and structure the resume data in the following EXACT JSON format (respond ONLY with valid JSON, no markdown code blocks):

{
  "personalInfo": {
    "name": "Full name from resume (preserve exact capitalization)",
    "email": "Email address",
    "phone": "Phone number (preserve formatting with dashes/spaces as shown)",
    "location": "City, State/Country (preserve exact format)",
    "linkedin": "LinkedIn URL if present",
    "website": "Personal website if present"
  },
  "professionalTitle": "Job title or professional designation (preserve exact capitalization and formatting)",
  "summary": "Professional summary or objective (preserve paragraph structure, line breaks, and formatting - keep as single well-formatted string)",
  "workExperience": [
    {
      "jobTitle": "Job title (preserve exact capitalization)",
      "company": "Company name (preserve exact capitalization)",
      "location": "Location if mentioned (preserve format)",
      "startDate": "Start date (MM/YYYY or YYYY format - preserve original format)",
      "endDate": "End date (MM/YYYY or YYYY format) or 'Present' if current (preserve original format)",
      "current": true/false,
      "description": ["Bullet point 1 (preserve exact wording and formatting)", "Bullet point 2", ...]
    }
  ],
  "education": [
    {
      "degree": "Degree name (preserve exact capitalization and format, e.g., 'Bachelor of Science in Computer Science')",
      "institution": "University/College name (preserve exact capitalization)",
      "location": "Location if mentioned (preserve format)",
      "graduationDate": "Graduation date (MM/YYYY or YYYY - preserve original format)",
      "gpa": "GPA if mentioned (preserve format)"
    }
  ],
  "skills": ["Skill 1 (preserve exact capitalization)", "Skill 2", ...],
  "projects": [
    {
      "name": "Project name (preserve exact capitalization)",
      "description": "Project description (preserve formatting and structure)",
      "technologies": ["Tech 1", "Tech 2"] if mentioned,
      "duration": "Duration if mentioned (preserve format)"
    }
  ],
  "certifications": ["Certification 1 (preserve exact format)", "Certification 2", ...] if present,
  "languages": ["Language 1", "Language 2", ...] if present
}

CRITICAL EXTRACTION RULES:
1. PRESERVE FORMATTING: Maintain the exact formatting, capitalization, punctuation, and structure from the original resume
2. PRESERVE STRUCTURE: Keep section order, bullet point formatting, and paragraph structure exactly as shown
3. PRESERVE CAPITALIZATION: Keep all proper nouns, job titles, company names, and section headers exactly as written
4. PRESERVE DATES: Maintain the exact date format used in the original (MM/YYYY, YYYY, etc.)
5. PRESERVE CONTENT: Extract ALL information accurately without modification
6. For work experience descriptions: Preserve each bullet point as a separate array item, maintaining exact wording
7. For summary: Keep as a single well-formatted string preserving paragraph structure and line breaks
8. For dates: Use consistent format (prefer MM/YYYY) but preserve original if different
9. If a field is not found, use empty string for strings, empty array for arrays
10. Extract professional title from header or summary if available, preserving exact capitalization

The goal is to extract data while maintaining the professional, polished appearance and formatting of the original resume.
`;

    console.log("Calling Gemini API for data extraction...");
    const result = await tryGenerateContent(extractionPrompt);
    const response = await result.response;
    const extractedText = response.text();

    // Parse JSON response
    let extractedJson = extractedText.trim();
    if (extractedJson.startsWith("```json")) {
      extractedJson = extractedJson.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (extractedJson.startsWith("```")) {
      extractedJson = extractedJson.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    const structuredData = JSON.parse(extractedJson);

    console.log("Successfully extracted structured resume data");

    return new Response(
      JSON.stringify({
        success: true,
        data: structuredData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("Extraction error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to extract resume data",
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});


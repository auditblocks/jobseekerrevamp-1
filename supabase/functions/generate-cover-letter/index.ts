/**
 * @module generate-cover-letter
 * @description Supabase Edge Function that generates a tailored cover letter for a
 * specific job, from the user's resume + profile. Same auth pattern as
 * generate-email-ai, but uses the AI provider waterfall already established in
 * generate-exam-questions (OpenRouter → Gemini SDK → Lovable gateway) rather than
 * hard-requiring a single key — this is lightweight text generation, not the paid
 * Gemini Vision ATS analysis path.
 * Saves the result to `cover_letters` so it's editable/revisitable, not thrown away.
 *
 * Accepts POST body:
 *   { resume_id: string, naukri_job_id?: string, job_title?: string,
 *     company_name?: string, job_description?: string, tone?: "formal"|"warm"|"concise" }
 *
 * Requires (at least one): OPENROUTER_API_KEY | GEMINI_API_KEY/GOOGLE_GEMINI_API_KEY | LOVABLE_API_KEY
 * Also requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Auth: Bearer token (authenticated user)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { generateChatText } from "../_shared/ai-provider.ts";
import { resolveResumeText } from "../_shared/extract-resume-text.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  resume_id: string;
  naukri_job_id?: string;
  job_title?: string;
  company_name?: string;
  job_description?: string;
  tone?: "formal" | "warm" | "concise";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body: GenerateRequest = await req.json();
    const { resume_id, naukri_job_id, tone = "warm" } = body;
    if (!resume_id) return json({ error: "resume_id is required" }, 400);

    // Resume must belong to the caller — RLS would also enforce this, but the
    // service-role client bypasses RLS, so check explicitly.
    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .select("id, extracted_text, file_url, file_type")
      .eq("id", resume_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (resumeError) throw resumeError;
    if (!resume) return json({ error: "Resume not found" }, 404);

    // Most uploaded PDFs/DOCX have empty extracted_text (upload-resume defers
    // extraction). Resolve from the file on demand and cache it.
    let resumeText: string;
    try {
      resumeText = await resolveResumeText(supabase, resume);
    } catch (extractErr) {
      console.error("Resume text resolution failed:", extractErr);
      const msg = extractErr instanceof Error ? extractErr.message : "Could not read resume text";
      return json({ error: msg }, 400);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, professional_title, bio")
      .eq("id", user.id)
      .maybeSingle();

    let jobTitle = body.job_title?.trim() || "";
    let companyName = body.company_name?.trim() || "";
    let jobDescription = body.job_description?.trim() || "";

    if (naukri_job_id) {
      const { data: job, error: jobError } = await supabase
        .from("naukri_jobs")
        .select("title, company_name, summary")
        .eq("id", naukri_job_id)
        .maybeSingle();
      if (jobError) throw jobError;
      if (job) {
        jobTitle = jobTitle || job.title || "";
        companyName = companyName || job.company_name || "";
        jobDescription = jobDescription || job.summary || "";
      }
    }

    if (!jobTitle && !jobDescription) {
      return json({ error: "Provide a job title/description or a naukri_job_id." }, 400);
    }

    const toneInstruction =
      tone === "formal"
        ? "Formal and traditional in tone."
        : tone === "concise"
          ? "Concise — no more than 3 short paragraphs."
          : "Warm and professional, showing genuine interest.";

    const systemPrompt = `You are an expert cover letter writer. Write a tailored, specific cover letter — never generic filler.
Rules:
- Ground every claim in the candidate's actual resume content provided below; do not invent experience.
- Reference the target role/company by name where given.
- ${toneInstruction}
- 250-350 words.
- No placeholder brackets like [Company Name] — use the real values given, or omit the line if unknown.

Return your response as JSON with a single "content" field containing the full letter body (no subject/greeting boilerplate needed beyond a natural salutation).`;

    const userPrompt = `Candidate:
- Name: ${profile?.name || "the candidate"}
- Current title: ${profile?.professional_title || "Professional"}
- Bio: ${profile?.bio || "N/A"}

Resume content (verbatim, use for specifics):
${resumeText.slice(0, 6000)}

Target role:
- Job title: ${jobTitle || "N/A"}
- Company: ${companyName || "N/A"}
- Job description: ${jobDescription ? jobDescription.slice(0, 3000) : "N/A"}

Write the cover letter now.`;

    let rawContent: string;
    try {
      rawContent = await generateChatText({ systemPrompt, userPrompt, temperature: 0.7 });
    } catch (aiError) {
      console.error("AI provider error:", aiError);
      const msg = aiError instanceof Error ? aiError.message : "Failed to generate cover letter";
      if (msg.includes("429")) return json({ error: "Rate limit exceeded. Please try again later." }, 429);
      if (msg.includes("402")) return json({ error: "AI credits depleted. Please try again later." }, 402);
      // Surface a short provider detail so the UI / logs show the real failure
      // (e.g. OpenRouter model 404) instead of a generic non-2xx FunctionsHttpError.
      const short = msg.length > 280 ? `${msg.slice(0, 280)}…` : msg;
      return json({ error: `Failed to generate cover letter: ${short}` }, 502);
    }

    let letterContent: string;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        letterContent = typeof parsed.content === "string" ? parsed.content : rawContent;
      } else {
        letterContent = rawContent;
      }
    } catch {
      letterContent = rawContent;
    }
    letterContent = letterContent.trim();

    if (!letterContent) {
      return json({ error: "AI returned an empty cover letter. Please try again." }, 502);
    }

    const { data: saved, error: saveError } = await supabase
      .from("cover_letters")
      .insert({
        user_id: user.id,
        resume_id,
        naukri_job_id: naukri_job_id ?? null,
        job_title: jobTitle || null,
        company_name: companyName || null,
        content: letterContent,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return json({ success: true, cover_letter: saved });
  } catch (error) {
    console.error("Error generating cover letter:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});

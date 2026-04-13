/**
 * @module generate-exam-questions
 * @description Supabase Edge Function that generates AI-powered practice question
 * sets for Indian government job exams. The generation pipeline:
 *
 *   1. Authenticate the user and enforce the entitlement gate — PRO_MAX users get
 *      unrestricted access; lower tiers must have the job in their tracker.
 *   2. Fetch exam configuration (`master_exams`) and previous-year questions (PYQs)
 *      to seed the AI prompt with real section distributions & difficulty ratios.
 *   3. Generate questions in batches of 15 (to stay within LLM token limits) using
 *      the first available AI provider: OpenRouter → Gemini SDK → Lovable gateway.
 *   4. Parse the JSON responses with fallback regex extraction, then persist all
 *      questions to `exam_questions`.
 *
 * @requires SUPABASE_URL
 * @requires SUPABASE_SERVICE_ROLE_KEY
 * @requires OPENROUTER_API_KEY | GEMINI_API_KEY | LOVABLE_API_KEY  (at least one)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
    jobId: string;
    examName: string;
    postName: string;
    organization: string;
    count?: number;
    masterExamId?: string;
}

const systemPrompt = `You are an expert Exam Practice Set Generator for Indian Government Jobs. 
Specifically, you follow a data-driven approach based on previous year trends.

Your goal is to generate a practice question set that:
1. Matches the real exam pattern and syllabus exactly.
2. Maintains the requested section-wise weightage.
3. Maintains the requested difficulty ratio (Easy/Medium/Hard).
4. Includes high-frequency topics identified from previous year trends.
5. Covers maximum syllabus depth while avoiding repeated patterns.

IMPORTANT: Respond ONLY with a JSON array of objects. Do not include any text before or after the JSON.
Each object must have this structure:
{
  "type": "mcq",
  "section": "General Intelligence", 
  "topic": "Syllogism",
  "difficulty": "medium",
  "question_text": "...",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "Option A",
  "explanation": "..."
}`;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_GEMINI_API_KEY");
        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");

        // --- Auth: verify JWT and load profile ---
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

        const body: GenerateRequest = await req.json();
        const { jobId, examName, postName, organization, count, masterExamId } = body;

        // --- Tier + entitlement gate ---
        // PRO_MAX users can generate for any job; lower tiers must have explicitly
        // tracked the job — this prevents abuse of the AI generation quota
        const { data: profile } = await supabase
            .from("profiles")
            .select("subscription_tier")
            .eq("id", user.id)
            .single();

        const tier = profile?.subscription_tier ?? "FREE";

        if (tier !== "PRO_MAX") {
            const { data: trackerRow } = await supabase
                .from("job_tracker")
                .select("id")
                .eq("user_id", user.id)
                .eq("job_id", jobId)
                .maybeSingle();

            if (!trackerRow) {
                return new Response(
                    JSON.stringify({ error: "AI practice-set generation requires PRO_MAX, or the job must be in your tracker." }),
                    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // 1. Fetch exam configuration from master_exams
        let config = null;
        let pyqs = [];

        if (masterExamId || examName) {
            const query = supabase.from("master_exams").select("*");
            if (masterExamId) {
                query.eq("id", masterExamId);
            } else {
                query.ilike("name", `%${examName}%`);
            }

            const { data: examData } = await query.maybeSingle();
            if (examData) {
                config = examData;

                // 2. Analyze last 5 years previous year questions
                const { data: pyqData } = await supabase
                    .from("previous_year_questions")
                    .select("*")
                    .eq("master_exam_id", config.id)
                    .order("year", { ascending: false })
                    .limit(50);

                pyqs = pyqData || [];
            }
        }

        // Clamp question count to [1, 120] to prevent prompt abuse or excessively long runs
        const rawCount = count ?? config?.total_questions ?? 10;
        const totalCount = Math.min(120, Math.max(1, Math.floor(Number(rawCount)) || 10));
        const sectionInfo = config?.section_distribution
            ? `Section Distribution: ${JSON.stringify(config.section_distribution)}`
            : "Section Distribution: General mix of relevant sections.";

        const difficultyInfo = config?.difficulty_ratio
            ? `Difficulty Ratio: ${JSON.stringify(config.difficulty_ratio)}`
            : "Difficulty Ratio: 30% Easy, 50% Medium, 20% Hard.";

        const pyqInfo = pyqs.length > 0
            ? `Analysis of Previous Year Trends (Year-wise): ${JSON.stringify(pyqs.map((p: any) => ({ year: p.year, topic: p.topic, difficulty: p.difficulty, section: p.section })))}`
            : "No specific PYQ data available in DB. Use your internal knowledge of the last 5 years of this exam to identify high-frequency topics, topic weightage, difficulty trends, and repeated question patterns.";

        // --- BATCH GENERATION LOGIC ---
        // Generate in batches of 15 to stay within most LLMs' reliable output token
        // window; larger batches risk truncated JSON and wasted API calls
        const BATCH_SIZE = 15;
        const allQuestions: any[] = [];
        const iterations = Math.ceil(totalCount / BATCH_SIZE);

        console.log(`Starting generation for ${totalCount} questions in ${iterations} batches...`);

        for (let i = 0; i < iterations; i++) {
            const currentBatchCount = Math.min(BATCH_SIZE, totalCount - allQuestions.length);
            if (currentBatchCount <= 0) break;

            console.log(`Generating batch ${i + 1}/${iterations} (${currentBatchCount} questions)...`);

            const userPrompt = `Generate a BATCH of ${currentBatchCount} practice questions for:
Exam Name: ${config?.name || examName || "General Recruitment"}
Post Name: ${postName}
Organization: ${organization}

${sectionInfo}
${difficultyInfo}
${pyqInfo}

Full timed mock target: ${totalCount} questions total (all batches), roughly ${totalCount} minutes if candidates spend about one minute per question.
This is batch ${i + 1} of ${iterations}. Avoid repeating questions from previous batches.
The practice set must provide an exam-like difficulty and a real-exam experience.
Respond ONLY with the JSON array.`;

            let content = "";

            // AI provider waterfall: OpenRouter (preferred) → Gemini SDK → Lovable gateway
            if (openRouterApiKey) {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${openRouterApiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: "google/gemini-2.0-flash-001",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ],
                        temperature: 0.7,
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`OpenRouter Error: ${response.status} ${errorText}`);
                }

                const aiData = await response.json();
                content = aiData.choices?.[0]?.message?.content;
            } else if (geminiApiKey && geminiApiKey.startsWith("AIza")) {
                const genAI = new GoogleGenerativeAI(geminiApiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
                const response = await result.response;
                content = response.text();
            } else {
                const apiKey = geminiApiKey || lovableApiKey;
                if (!apiKey) throw new Error("No AI API Key found");

                const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: "google/gemini-pro",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ],
                        temperature: 0.7,
                    }),
                });

                const aiData = await response.json();
                content = aiData.choices?.[0]?.message?.content;
            }

            // --- Robust Parsing for this Batch ---
            // LLMs sometimes wrap JSON in markdown fences or include preamble text;
            // we strip fences first and fall back to regex extraction if JSON.parse fails
            let batchQuestions = [];
            try {
                let cleanedContent = content.trim();
                cleanedContent = cleanedContent.replace(/^```json\n?/, "").replace(/\n?```$/, "");
                cleanedContent = cleanedContent.replace(/^```\n?/, "").replace(/\n?```$/, "");

                try {
                    batchQuestions = JSON.parse(cleanedContent);
                } catch (e) {
                    const jsonMatch = cleanedContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
                    if (jsonMatch) {
                        batchQuestions = JSON.parse(jsonMatch[0]);
                    } else {
                        console.error("Failed to find JSON in batch response:", content);
                        continue; // Skip this batch or retry? For now, continue to next
                    }
                }

                if (Array.isArray(batchQuestions)) {
                    allQuestions.push(...batchQuestions);
                }
            } catch (err) {
                console.error(`Error parsing batch ${i + 1}:`, err);
            }
        }

        if (allQuestions.length === 0) {
            throw new Error("Failed to generate any valid questions. AI response might be invalid.");
        }

        const trimmed = allQuestions.slice(0, totalCount);
        console.log(`Successfully generated ${trimmed.length} questions (trimmed from ${allQuestions.length}).`);

        // 3. Insert into database
        const payload = trimmed.map((q: any) => ({
            job_id: jobId,
            master_exam_id: config?.id,
            ...q
        }));

        const { error: insertError } = await supabase
            .from("exam_questions")
            .insert(payload);

        if (insertError) throw insertError;

        return new Response(
            JSON.stringify({ success: true, count: trimmed.length }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("Error generating questions:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

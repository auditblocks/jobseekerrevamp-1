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

Return your response as a JSON array of objects with the following structure:
[
  {
    "type": "mcq",
    "section": "General Intelligence", 
    "topic": "Syllogism",
    "difficulty": "medium",
    "question_text": "...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "..."
  }
]`;

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

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("No authorization header");

        const body: GenerateRequest = await req.json();
        const { jobId, examName, postName, organization, count, masterExamId } = body;

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

        const finalCount = count || config?.total_questions || 10;
        const sectionInfo = config?.section_distribution
            ? `Section Distribution: ${JSON.stringify(config.section_distribution)}`
            : "Section Distribution: General mix of relevant sections.";

        const difficultyInfo = config?.difficulty_ratio
            ? `Difficulty Ratio: ${JSON.stringify(config.difficulty_ratio)}`
            : "Difficulty Ratio: 30% Easy, 50% Medium, 20% Hard.";

        const pyqInfo = pyqs.length > 0
            ? `Analysis of Previous Year Trends (Year-wise): ${JSON.stringify(pyqs.map((p: any) => ({ year: p.year, topic: p.topic, difficulty: p.difficulty, section: p.section })))}`
            : "No specific PYQ data available in DB. Use your internal knowledge of the last 5 years of this exam to identify high-frequency topics, topic weightage, difficulty trends, and repeated question patterns.";

        const userPrompt = `Generate ${finalCount} practice questions for:
Exam Name: ${config?.name || examName || "General Recruitment"}
Post Name: ${postName}
Organization: ${organization}

${sectionInfo}
${difficultyInfo}
${pyqInfo}

The practice set must provide an exam-like difficulty and a real-exam experience.
Respond ONLY with the JSON array.`;

        let content = "";

        // AI Logic
        if (openRouterApiKey) {
            console.log("Using OpenRouter API...");
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
            console.log("Using direct Google Gemini API...");
            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
            const response = await result.response;
            content = response.text();
        } else {
            console.log("Using Lovable AI Gateway...");
            const apiKey = geminiApiKey || lovableApiKey;
            if (!apiKey) throw new Error("No AI API Key found (OPENROUTER_API_KEY, GEMINI_API_KEY or LOVABLE_API_KEY)");

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

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`AI Gateway Error: ${response.status} ${errorText}`);
            }

            const aiData = await response.json();
            content = aiData.choices?.[0]?.message?.content;
        }

        console.log("AI Response received (first 100 chars):", content.substring(0, 100));

        // Parsing
        let questions;
        try {
            let cleanedContent = content.trim();
            if (cleanedContent.startsWith("```json")) {
                cleanedContent = cleanedContent.replace(/^```json\n?/, "").replace(/\n?```$/, "");
            } else if (cleanedContent.startsWith("```")) {
                cleanedContent = cleanedContent.replace(/^```\n?/, "").replace(/\n?```$/, "");
            }

            try {
                questions = JSON.parse(cleanedContent);
            } catch (e) {
                const jsonMatch = cleanedContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
                if (jsonMatch) {
                    questions = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error("No valid JSON array found in response");
                }
            }
        } catch (parseError: any) {
            console.error("Content that failed to parse:", content);
            throw new Error(`Failed to parse AI response as JSON array: ${parseError.message}`);
        }

        // Insert into database
        const payload = questions.map((q: any) => ({
            job_id: jobId,
            master_exam_id: config?.id,
            ...q
        }));

        const { error: insertError } = await supabase
            .from("exam_questions")
            .insert(payload);

        if (insertError) throw insertError;

        return new Response(
            JSON.stringify({ success: true, count: questions.length }),
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

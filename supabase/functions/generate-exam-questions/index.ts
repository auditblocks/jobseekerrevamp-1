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
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!;

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            throw new Error("No authorization header");
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { jobId, examName, postName, organization, count = 10 }: GenerateRequest = await req.json();

        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = `You are an expert government job examination coach in India. 
Generate a set of practice questions for the following job profile.
The questions should be a mix of Multiple Choice Questions (MCQs) and Fill-in-the-blanks.
Questions must be relevant to previous year trends for this specific exam/post.

Return your response as a JSON array of objects with the following structure:
[
  {
    "type": "mcq",
    "question_text": "...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "..."
  },
  {
    "type": "fill_blank",
    "question_text": "...",
    "options": null,
    "correct_answer": "...",
    "explanation": "..."
  }
]`;

        const userPrompt = `Generate ${count} practice questions for:
Exam Name: ${examName || "General Recruitment"}
Post Name: ${postName}
Organization: ${organization}

Ensure the level of difficulty matches the standard for this government sector role. Respond ONLY with the JSON array.`;

        const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
        const response = await result.response;
        const content = response.text();

        // Parse JSON
        let questions;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            questions = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error("Failed to parse AI response as JSON array");
        }

        // Insert into database
        const payload = questions.map((q: any) => ({
            job_id: jobId,
            ...q
        }));

        const { error: insertError } = await supabase
            .from("exam_questions")
            .insert(payload);

        if (insertError) throw insertError;

        return new Response(
            JSON.stringify({ success: true, count: questions.length }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error: any) {
        console.error("Error generating questions:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});

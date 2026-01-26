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

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Try both common naming conventions for Gemini keys
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_GEMINI_API_KEY");
        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("No authorization header");

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { jobId, examName, postName, organization, count = 10 }: GenerateRequest = await req.json();

        const userPrompt = `Generate ${count} practice questions for:
Exam Name: ${examName || "General Recruitment"}
Post Name: ${postName}
Organization: ${organization}

Ensure the level of difficulty matches the standard for this government sector role. Respond ONLY with the JSON array.`;

        let content = "";

        // Detect if we should use direct Google SDK or Lovable Gateway
        if (geminiApiKey && geminiApiKey.startsWith("AIza")) {
            console.log("Using direct Google Gemini API...");
            const genAI = new GoogleGenerativeAI(geminiApiKey);
            // Reverting to gemini-2.0-flash-exp as gemini-3-flash-preview has known issues with JSON output stability
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
            const response = await result.response;
            content = response.text();
        } else {
            console.log("Using Lovable AI Gateway...");
            const apiKey = geminiApiKey || lovableApiKey;
            if (!apiKey) throw new Error("No AI API Key found (GEMINI_API_KEY or LOVABLE_API_KEY)");

            const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "google/gemini-2.0-flash-exp",
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

        // Parse JSON - be more robust with regex and fallback
        let questions;
        try {
            // Clean up markdown code blocks if present
            let cleanedContent = content.trim();
            if (cleanedContent.startsWith("```json")) {
                cleanedContent = cleanedContent.replace(/^```json\n?/, "").replace(/\n?```$/, "");
            } else if (cleanedContent.startsWith("```")) {
                cleanedContent = cleanedContent.replace(/^```\n?/, "").replace(/\n?```$/, "");
            }

            // Attempt direct parse first
            try {
                questions = JSON.parse(cleanedContent);
            } catch (e) {
                // Fallback to regex if direct parse fails
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

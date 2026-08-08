/**
 * @file ai-provider — Shared AI text-generation waterfall for lightweight chat-style
 * calls (cover letters, reply intent classification, etc.). Extracted from the
 * provider fallback chain already proven in generate-exam-questions/index.ts:
 * OpenRouter (preferred — actually configured on this project) → Gemini SDK →
 * Lovable AI gateway. Never used for the paid Gemini Vision ATS analysis path,
 * which stays in analyze-resume-ats with its own dedicated billing logic.
 */
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

export interface ChatTextRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

/**
 * Runs a system+user prompt through whichever AI provider has a configured key,
 * in preference order. Throws if none are configured or every attempted call fails.
 */
export async function generateChatText({
  systemPrompt,
  userPrompt,
  temperature = 0.7,
}: ChatTextRequest): Promise<string> {
  const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_GEMINI_API_KEY");
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  if (openRouterApiKey) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
      }),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenRouter error: ${res.status} ${errorText}`);
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim()) return content;
    throw new Error("OpenRouter returned an empty response");
  }

  if (geminiApiKey && geminiApiKey.startsWith("AIza")) {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
      return (await result.response).text();
    } catch (e) {
      console.error("Gemini 1.5-flash failed, trying gemini-pro fallback:", e);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
      return (await result.response).text();
    }
  }

  if (lovableApiKey) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
      }),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Lovable AI gateway error: ${res.status} ${errorText}`);
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim()) return content;
    throw new Error("Lovable AI gateway returned an empty response");
  }

  throw new Error("No AI provider configured (OPENROUTER_API_KEY, GEMINI_API_KEY, or LOVABLE_API_KEY).");
}

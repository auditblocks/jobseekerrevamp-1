/**
 * @file ai-provider — Shared AI text-generation waterfall for lightweight chat-style
 * calls (cover letters, reply intent classification, etc.).
 *
 * Preference order mirrors working generators (ai-chat / generate-blog-post):
 *   1. OpenRouter (`google/gemini-2.0-flash`)
 *   2. Direct Gemini SDK (several model IDs)
 *   3. Lovable AI gateway
 *
 * OpenRouter failures must fall through — do NOT throw on the first provider error,
 * or a stale model ID / transient 4xx blocks Gemini even when GEMINI_API_KEY is set.
 */
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

export interface ChatTextRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

const OPENROUTER_MODELS = [
  "google/gemini-2.0-flash",
  "google/gemini-2.0-flash-001",
  "google/gemini-flash-1.5",
];

// Same waterfall as analyze-resume-ats / optimize-resume (resume optimizer module).
const GEMINI_MODELS = [
  "gemini-1.5-flash",
  "gemini-2.5-flash",
  "gemini-1.5-pro",
  "gemini-pro",
];

/**
 * Runs a system+user prompt through whichever AI provider has a configured key,
 * in preference order. Throws only if none are configured or every attempt fails.
 */
export async function generateChatText({
  systemPrompt,
  userPrompt,
  temperature = 0.7,
}: ChatTextRequest): Promise<string> {
  const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
  // Prefer the same env var as resume optimizer; GEMINI_API_KEY is an accepted alias.
  const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  const errors: string[] = [];

  // Resume-optimizer path first (direct Gemini), then OpenRouter / Lovable as backup.
  if (geminiApiKey) {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    for (const modelName of GEMINI_MODELS) {
      try {
        console.log(`ai-provider: trying Gemini SDK model ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
        const text = (await result.response).text();
        if (text?.trim()) {
          console.log(`ai-provider: Gemini ${modelName} succeeded`);
          return text;
        }
        errors.push(`Gemini ${modelName}: empty response`);
      } catch (e) {
        const msg = `Gemini ${modelName}: ${e instanceof Error ? e.message : String(e)}`;
        console.warn(msg);
        errors.push(msg);
        if (!msg.includes("404") && !msg.includes("not found")) {
          // Auth / quota errors — don't keep hammering the same key with other models
          // unless it's a model-not-found (same policy as analyze-resume-ats).
          break;
        }
      }
    }
  } else {
    errors.push("GOOGLE_GEMINI_API_KEY not set");
  }

  if (openRouterApiKey?.trim()) {
    for (const model of OPENROUTER_MODELS) {
      try {
        console.log(`ai-provider: trying OpenRouter model ${model}`);
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterApiKey.trim()}`,
            "Content-Type": "application/json",
            "HTTP-Referer": Deno.env.get("SITE_URL") || "https://startworking.in",
            "X-Title": "JobSeeker",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature,
          }),
        });
        if (!res.ok) {
          const errorText = await res.text();
          const msg = `OpenRouter ${model}: ${res.status} ${errorText.slice(0, 300)}`;
          console.warn(msg);
          errors.push(msg);
          continue;
        }
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.trim()) {
          console.log(`ai-provider: OpenRouter ${model} succeeded`);
          return content;
        }
        errors.push(`OpenRouter ${model}: empty response`);
      } catch (e) {
        const msg = `OpenRouter ${model}: ${e instanceof Error ? e.message : String(e)}`;
        console.error(msg);
        errors.push(msg);
      }
    }
  } else {
    errors.push("OPENROUTER_API_KEY not set");
  }

  if (lovableApiKey?.trim()) {
    try {
      console.log("ai-provider: trying Lovable AI gateway");
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey.trim()}`,
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
        errors.push(`Lovable: ${res.status} ${errorText.slice(0, 300)}`);
      } else {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.trim()) {
          console.log("ai-provider: Lovable gateway succeeded");
          return content;
        }
        errors.push("Lovable: empty response");
      }
    } catch (e) {
      errors.push(`Lovable: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    errors.push("LOVABLE_API_KEY not set");
  }

  throw new Error(`All AI providers failed. ${errors.slice(0, 4).join(" | ")}`);
}

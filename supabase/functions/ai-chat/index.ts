/**
 * @module ai-chat
 * @description Supabase Edge Function that powers the public "JobSeeker AI" chatbot.
 * Streams responses via SSE using either OpenRouter (preferred) or the Lovable AI
 * gateway as a fallback. Injects curated site knowledge, safety rules, and live
 * listing context into the system prompt. Optionally logs user messages to
 * `chatbot_conversations` for authenticated visitors.
 *
 * Requires: OPENROUTER_API_KEY or LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Auth: Optional Bearer token (unauthenticated visitors can still use the chatbot)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";
import { CHATBOT_SAFETY_RULES, LISTING_SNAPSHOT_RULES, SITE_KNOWLEDGE } from "./site-knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Prefer OpenRouter when available; fall back to Lovable gateway
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY")?.trim();
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")?.trim();
    const useOpenRouter = !!openRouterKey;
    if (!useOpenRouter && !lovableApiKey) {
      throw new Error("Configure OPENROUTER_API_KEY or LOVABLE_API_KEY for ai-chat");
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth is optional: anonymous visitors can still chat, but we log messages for signed-in users
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body: ChatRequest = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const context = typeof body.context === "string" ? body.context.trim() : "";

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are **JobSeeker AI**, the official website assistant for **JobSeeker** (startworking.in).

Your job is to help visitors and users understand the product, find the right pages, and get general job-search guidance.

${SITE_KNOWLEDGE}

${CHATBOT_SAFETY_RULES}

${LISTING_SNAPSHOT_RULES}

You may also help with:
- Writing or improving resumes and cover letters (general guidance)
- Drafting recruiter outreach emails (general guidance)
- Interview preparation tips and job search strategies

Be professional, encouraging, and actionable.
${context ? `\n## Current page context\n${context}\n` : ""}`;

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages,
    ];

    let sseStream: ReadableStream | null = null;

    // 1. Try OpenRouter
    if (openRouterKey) {
      try {
        console.log("Chatbot attempting OpenRouter...");
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": Deno.env.get("SITE_URL") || "https://startworking.in",
            "X-Title": "JobSeeker Chat",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash",
            messages: chatMessages,
            stream: true,
          }),
        });

        if (response.ok && response.body) {
          console.log("Chatbot OpenRouter stream obtained");
          sseStream = response.body;
        } else {
          const errText = await response.text();
          console.warn("OpenRouter chatbot response not ok:", response.status, errText.slice(0, 300));
        }
      } catch (err) {
        console.error("OpenRouter chatbot request failed:", err);
      }
    }

    // 2. Try Lovable Gateway
    if (!sseStream && lovableApiKey) {
      try {
        console.log("Chatbot attempting Lovable gateway...");
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-pro",
            messages: chatMessages,
            stream: true,
          }),
        });

        if (response.ok && response.body) {
          console.log("Chatbot Lovable gateway stream obtained");
          sseStream = response.body;
        } else {
          const errText = await response.text();
          console.warn("Lovable chatbot response not ok:", response.status, errText.slice(0, 300));
        }
      } catch (err) {
        console.error("Lovable chatbot request failed:", err);
      }
    }

    // 3. Fallback to direct Google Gemini API (using GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY)
    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
    if (!sseStream && geminiApiKey) {
      const geminiModels = ["gemini-1.5-flash-latest", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-pro"];
      const genAI = new GoogleGenerativeAI(geminiApiKey);

      for (const modelName of geminiModels) {
        try {
          console.log(`Chatbot attempting direct Gemini API with model: ${modelName}...`);
          const systemMsg = chatMessages.find(m => m.role === "system")?.content;
          const otherMsgs = chatMessages.filter(m => m.role !== "system").map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          }));

          const activeModel = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemMsg,
          });

          const result = await activeModel.generateContentStream({
            contents: otherMsgs,
          });

          const { readable, writable } = new TransformStream();
          const writer = writable.getWriter();
          const encoder = new TextEncoder();

          (async () => {
            try {
              for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                  const openAiChunk = {
                    choices: [
                      {
                        delta: {
                          content: text,
                        },
                      },
                    ],
                  };
                  await writer.write(encoder.encode(`data: ${JSON.stringify(openAiChunk)}\n\n`));
                }
              }
              await writer.write(encoder.encode("data: [DONE]\n\n"));
            } catch (streamErr: any) {
              console.error("Gemini chatbot stream error:", streamErr);
              const errChunk = {
                error: streamErr.message || String(streamErr)
              };
              await writer.write(encoder.encode(`data: ${JSON.stringify(errChunk)}\n\n`));
            } finally {
              await writer.close();
            }
          })();

          sseStream = readable;
          console.log(`Chatbot direct Gemini API stream obtained with model: ${modelName}`);
          break; // Exit models loop on success
        } catch (geminiErr: any) {
          console.warn(`Direct Gemini API model ${modelName} call failed:`, geminiErr.message || geminiErr);
        }
      }
    }

    if (!sseStream) {
      throw new Error("All AI providers (OpenRouter, Lovable, Gemini Direct) failed or were not configured.");
    }

    // Persist the latest user message for analytics/debugging (fire-and-forget)
    if (userId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        await supabase.from("chatbot_conversations").insert({
          user_id: userId,
          message: lastMessage.content,
        });
      }
    }

    // Proxy the upstream SSE stream directly to the client for low-latency streaming
    return new Response(sseStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

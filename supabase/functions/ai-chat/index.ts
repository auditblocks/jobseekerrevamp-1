import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
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
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY")?.trim();
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")?.trim();
    const useOpenRouter = !!openRouterKey;
    if (!useOpenRouter && !lovableApiKey) {
      throw new Error("Configure OPENROUTER_API_KEY or LOVABLE_API_KEY for ai-chat");
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const response = useOpenRouter
      ? await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": Deno.env.get("SITE_URL") || "https://startworking.in",
            "X-Title": "JobSeeker Chat",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-001",
            messages: chatMessages,
            stream: true,
          }),
        })
      : await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error("Failed to get AI response");
    }

    if (userId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        await supabase.from("chatbot_conversations").insert({
          user_id: userId,
          message: lastMessage.content,
        });
      }
    }

    return new Response(response.body, {
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

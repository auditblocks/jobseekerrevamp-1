/**
 * @file ai-chat-stream.ts
 * Client-side streaming consumer for the `ai-chat` Supabase edge function.
 * Reads an OpenAI-compatible SSE stream and emits token deltas via a callback.
 */

import { supabase } from "@/integrations/supabase/client";

export type ChatRole = "user" | "assistant";

/** A single turn in the chat conversation history sent to the edge function. */
export interface ChatTurn {
  role: ChatRole;
  content: string;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/**
 * Parses a single SSE `data:` line and extracts the assistant content delta.
 * Returns `null` for keep-alive, `[DONE]`, or non-content events.
 */
function parseSseDataLine(line: string): string | null {
  const prefix = "data:";
  const trimmed = line.trimStart();
  if (!trimmed.startsWith(prefix)) return null;
  const payload = trimmed.slice(prefix.length).trim();
  if (payload === "" || payload === "[DONE]") return null;
  try {
    const json = JSON.parse(payload) as {
      choices?: Array<{ delta?: { content?: string | null } }>;
    };
    const piece = json.choices?.[0]?.delta?.content;
    return typeof piece === "string" && piece.length > 0 ? piece : null;
  } catch {
    return null;
  }
}

/**
 * Streams assistant tokens from the ai-chat edge function (OpenAI-compatible SSE).
 * Uses the user's JWT when signed in; otherwise sends the anon key as Bearer (public function).
 */
export async function streamAiChat(
  messages: ChatTurn[],
  options: {
    context?: string;
    onDelta: (chunk: string) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  if (!url || !anonKey) {
    throw new Error("Supabase URL or key is not configured");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const bearer = session?.access_token ?? anonKey;

  const res = await fetch(`${url}/functions/v1/ai-chat`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      ...(options.context ? { context: options.context } : {}),
    }),
    signal: options.signal,
  });

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    let detail = res.statusText;
    try {
      if (contentType.includes("application/json")) {
        const j = (await res.json()) as { error?: string };
        if (j?.error) detail = j.error;
      } else {
        const t = await res.text();
        if (t) detail = t.slice(0, 500);
      }
    } catch {
      /* keep detail */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }

  if (!res.body) {
    throw new Error("Empty response body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  // `carry` buffers an incomplete line across read() chunks.
  let carry = "";

  const flushLine = (raw: string) => {
    const line = raw.replace(/\r$/, "");
    const text = parseSseDataLine(line);
    if (text) options.onDelta(text);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      carry += decoder.decode(value, { stream: true });
      const lines = carry.split("\n");
      carry = lines.pop() ?? "";
      for (const raw of lines) {
        flushLine(raw);
      }
    }
    if (carry.trim()) {
      flushLine(carry);
    }
  } finally {
    reader.releaseLock();
  }
}

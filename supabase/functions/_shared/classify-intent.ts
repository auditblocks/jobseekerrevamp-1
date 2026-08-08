/**
 * @file classify-intent — Single-call reply intent classification via the shared
 * AI provider waterfall (OpenRouter → Gemini SDK → Lovable gateway — see
 * _shared/ai-provider.ts). Not the paid Gemini Vision ATS path.
 *
 * Used by check-gmail-replies and gmail-webhook right after a recruiter reply is
 * inserted into conversation_messages. Classification is best-effort: callers
 * should swallow errors from this helper so reply ingestion never blocks on it.
 */
import { generateChatText } from "./ai-provider.ts";

export type ReplyIntent = "interested" | "rejection" | "auto_reply" | "neutral";

export interface IntentClassification {
  intent: ReplyIntent;
  confidence: number;
}

const VALID_INTENTS: ReplyIntent[] = ["interested", "rejection", "auto_reply", "neutral"];

const SYSTEM_PROMPT =
  "Classify a recruiter's email reply into exactly one category: " +
  "\"interested\" (wants to move forward, schedules a call/interview, asks for more info), " +
  "\"rejection\" (explicitly declines, says position filled, not moving forward), " +
  "\"auto_reply\" (out-of-office, automated bounce, generic acknowledgment with no human judgment), " +
  "\"neutral\" (anything else — small talk, unclear, needs a human to read it). " +
  'Respond ONLY with JSON: {"intent": "<one of the four>", "confidence": <0-1 number>}.';

/**
 * Classifies a recruiter's reply body into one of four intents. Returns `null`
 * (rather than throwing) on any failure — no provider configured, rate limit,
 * malformed response — so callers can treat it as optional enrichment.
 */
export async function classifyIntent(bodyText: string): Promise<IntentClassification | null> {
  if (!bodyText?.trim()) return null;

  try {
    const raw = await generateChatText({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: bodyText.slice(0, 2000),
      temperature: 0.1,
    });

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]) as { intent?: string; confidence?: number };
    if (!parsed.intent || !VALID_INTENTS.includes(parsed.intent as ReplyIntent)) return null;

    const confidence = typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5;
    return { intent: parsed.intent as ReplyIntent, confidence };
  } catch (e) {
    console.error("classifyIntent failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

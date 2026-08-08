-- Reply intent classification: lets users triage recruiter replies at a glance
-- (interested vs rejection vs auto-reply vs neutral) instead of opening every
-- thread. Populated by check-gmail-replies / gmail-webhook via the shared
-- classify-intent helper (Lovable AI gateway) — fully additive, classification
-- failures never block reply ingestion.

ALTER TABLE public.conversation_messages
  ADD COLUMN IF NOT EXISTS intent TEXT
    CHECK (intent IN ('interested', 'rejection', 'auto_reply', 'neutral')),
  ADD COLUMN IF NOT EXISTS intent_confidence NUMERIC;

CREATE INDEX IF NOT EXISTS idx_conversation_messages_intent
  ON public.conversation_messages (intent)
  WHERE intent IS NOT NULL;

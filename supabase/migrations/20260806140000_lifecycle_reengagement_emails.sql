-- Lifecycle re-engagement emails: tracks which automated nudge emails have been
-- sent to which users so the daily cron job never double-sends the same nudge.
-- Written by the `lifecycle-reengagement-emails` edge function (service role only).

CREATE TABLE IF NOT EXISTS public.lifecycle_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, email_type)
);

CREATE INDEX IF NOT EXISTS lifecycle_email_log_user_id_idx
  ON public.lifecycle_email_log (user_id);

ALTER TABLE public.lifecycle_email_log ENABLE ROW LEVEL SECURITY;

-- No public policies: only the service role (used by the edge function) reads/writes
-- this table. Regular users have no need to see it, mirroring email_cooldowns' pattern.

COMMENT ON TABLE public.lifecycle_email_log IS
  'Dedup log for automated onboarding/retention emails (see lifecycle-reengagement-emails edge function).';

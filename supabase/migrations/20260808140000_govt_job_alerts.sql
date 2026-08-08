-- Govt job eligibility alerts (v1: keyword/organization match, not AI-parsed
-- age/education eligibility — govt_jobs has no structured eligibility columns
-- today, so full parsing is deferred). Users save keywords (organization names,
-- exam names, post types); a cron job notifies them when a new matching
-- posting appears, via in-app notification + email, deduped per (user, job).

CREATE TABLE IF NOT EXISTS public.govt_job_alert_prefs (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.govt_job_alert_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own govt job alert prefs"
  ON public.govt_job_alert_prefs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') THEN
    EXECUTE 'CREATE POLICY "Superadmins read govt_job_alert_prefs" ON public.govt_job_alert_prefs FOR SELECT USING (public.is_superadmin())';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.tg_govt_job_alert_prefs_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_govt_job_alert_prefs_touch ON public.govt_job_alert_prefs;
CREATE TRIGGER tg_govt_job_alert_prefs_touch
  BEFORE UPDATE ON public.govt_job_alert_prefs
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_govt_job_alert_prefs_touch();

-- Dedup log: guarantees one alert per (user, job) even if the cron overlaps runs.
CREATE TABLE IF NOT EXISTS public.govt_job_alert_log (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    govt_job_id UUID NOT NULL REFERENCES public.govt_jobs(id) ON DELETE CASCADE,
    notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, govt_job_id)
);

ALTER TABLE public.govt_job_alert_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') THEN
    EXECUTE 'CREATE POLICY "Superadmins read govt_job_alert_log" ON public.govt_job_alert_log FOR SELECT USING (public.is_superadmin())';
  END IF;
END $$;
-- No policy for regular users: this table is written only by the service-role
-- edge function and has no end-user-facing read path.

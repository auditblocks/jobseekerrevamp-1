-- Private job application tracker: status lifecycle for Naukri/LinkedIn applies,
-- mirroring the existing govt job_tracker pattern but keyed to naukri_jobs.
-- A row is created client-side alongside each private_job_applies insert
-- (see ApplyLatestJobs.tsx handleApply) rather than via a DB trigger, so the
-- apply flow stays the single source of truth for "did this apply happen".

CREATE TABLE IF NOT EXISTS public.private_job_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    naukri_job_id UUID NOT NULL REFERENCES public.naukri_jobs(id) ON DELETE CASCADE,
    application_status TEXT NOT NULL DEFAULT 'Applied'
      CHECK (application_status IN ('Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn')),
    notes TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_private_job_tracker_user_job
  ON public.private_job_tracker (user_id, naukri_job_id);

CREATE INDEX IF NOT EXISTS idx_private_job_tracker_user_status
  ON public.private_job_tracker (user_id, application_status);

ALTER TABLE public.private_job_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own private job tracker rows"
  ON public.private_job_tracker FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own private job tracker rows"
  ON public.private_job_tracker FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own private job tracker rows"
  ON public.private_job_tracker FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own private job tracker rows"
  ON public.private_job_tracker FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') THEN
    EXECUTE 'CREATE POLICY "Superadmins manage private_job_tracker" ON public.private_job_tracker FOR ALL USING (public.is_superadmin())';
  END IF;
END $$;

-- status_updated_at auto-bumps whenever application_status changes; updated_at
-- bumps on any change, reusing the shared trigger already used elsewhere.
CREATE OR REPLACE FUNCTION public.tg_private_job_tracker_status_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
    NEW.status_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_private_job_tracker_touch ON public.private_job_tracker;
CREATE TRIGGER tg_private_job_tracker_touch
  BEFORE UPDATE ON public.private_job_tracker
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_private_job_tracker_status_touch();

-- Tag sync runs as Naukri vs LinkedIn for unified admin log.

ALTER TABLE public.naukri_sync_log
  ADD COLUMN IF NOT EXISTS pipeline TEXT NOT NULL DEFAULT 'naukri';

ALTER TABLE public.naukri_sync_log
  DROP CONSTRAINT IF EXISTS naukri_sync_log_pipeline_check;

ALTER TABLE public.naukri_sync_log
  ADD CONSTRAINT naukri_sync_log_pipeline_check
  CHECK (pipeline IN ('naukri', 'linkedin'));

COMMENT ON COLUMN public.naukri_sync_log.pipeline IS 'Which Apify pipeline produced this run (naukri vs linkedin).';

CREATE INDEX IF NOT EXISTS idx_naukri_sync_log_pipeline_started
  ON public.naukri_sync_log (pipeline, started_at DESC);

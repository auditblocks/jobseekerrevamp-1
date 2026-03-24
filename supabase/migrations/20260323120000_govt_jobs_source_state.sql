-- Source registry + state filter for government job ingest (multi-portal)

ALTER TABLE public.govt_jobs
  ADD COLUMN IF NOT EXISTS source_key TEXT NOT NULL DEFAULT 'upsc';

ALTER TABLE public.govt_jobs
  ADD COLUMN IF NOT EXISTS state_code TEXT;

COMMENT ON COLUMN public.govt_jobs.source_key IS 'Ingest source id, e.g. upsc, ssc, tnpsc';
COMMENT ON COLUMN public.govt_jobs.state_code IS 'ISO 3166-2:IN style or IN for national; used for filters';

CREATE INDEX IF NOT EXISTS idx_govt_jobs_source_key ON public.govt_jobs (source_key);
CREATE INDEX IF NOT EXISTS idx_govt_jobs_state_code ON public.govt_jobs (state_code);

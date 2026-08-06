-- Live progress tracking for the Apify sync pipelines (Naukri + LinkedIn).
--
-- The sync edge functions already insert a `running` row into naukri_sync_log at
-- start and update it once at the end. These columns let them report intermediate
-- state (actor status, dataset download, per-item import) so the admin UI can poll
-- the row and render a live progress panel instead of an opaque spinner.

ALTER TABLE public.naukri_sync_log
  ADD COLUMN IF NOT EXISTS phase TEXT,
  ADD COLUMN IF NOT EXISTS phase_message TEXT,
  ADD COLUMN IF NOT EXISTS actor_status TEXT,
  ADD COLUMN IF NOT EXISTS progress_current INTEGER,
  ADD COLUMN IF NOT EXISTS progress_total INTEGER,
  ADD COLUMN IF NOT EXISTS dataset_item_count INTEGER,
  ADD COLUMN IF NOT EXISTS trigger_source TEXT,
  ADD COLUMN IF NOT EXISTS run_mode TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.naukri_sync_log.phase IS
  'Machine-readable stage: starting | resolving | actor_starting | actor_running | resolving_dataset | fetching_dataset | importing | done | failed';
COMMENT ON COLUMN public.naukri_sync_log.phase_message IS 'Human-readable description of the current stage.';
COMMENT ON COLUMN public.naukri_sync_log.actor_status IS 'Latest Apify run status (READY, RUNNING, SUCCEEDED, FAILED, ...).';
COMMENT ON COLUMN public.naukri_sync_log.progress_current IS 'Items processed so far in the current phase.';
COMMENT ON COLUMN public.naukri_sync_log.progress_total IS 'Total items expected in the current phase (null when unknown).';
COMMENT ON COLUMN public.naukri_sync_log.dataset_item_count IS 'Rows returned by the Apify dataset for this run.';
COMMENT ON COLUMN public.naukri_sync_log.trigger_source IS 'What started the run: manual | cron.';
COMMENT ON COLUMN public.naukri_sync_log.run_mode IS 'full (runs the Apify actor then imports) | import_only (imports an existing dataset).';

-- Backfill existing finished rows so the UI does not render them as stuck mid-phase.
UPDATE public.naukri_sync_log
SET phase = CASE WHEN status = 'success' THEN 'done' WHEN status = 'error' THEN 'failed' ELSE phase END
WHERE phase IS NULL AND status IN ('success', 'error');

-- Any row left as 'running' from before this migration can never be updated again
-- (its edge function invocation is long gone). Mark them errored so the UI's
-- "a sync is currently running" panel is not permanently pinned.
UPDATE public.naukri_sync_log
SET status = 'error',
    phase = 'failed',
    error_message = COALESCE(error_message, 'Run did not report completion (stale row closed by migration).'),
    finished_at = COALESCE(finished_at, NOW())
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '1 hour';

-- Fast lookup of the in-flight run for a pipeline (used by the admin progress poller).
CREATE INDEX IF NOT EXISTS idx_naukri_sync_log_running
  ON public.naukri_sync_log (pipeline, started_at DESC)
  WHERE status = 'running';

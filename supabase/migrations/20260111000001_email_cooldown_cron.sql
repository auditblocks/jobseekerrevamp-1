-- ============================================
-- EMAIL COOLDOWN CRON JOB SETUP
-- Schedules daily cleanup of expired cooldowns and notifications
-- ============================================

-- ===========================================
-- PART 1: ENABLE REQUIRED EXTENSIONS
-- ===========================================

-- Enable pg_cron for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ===========================================
-- PART 2: CREATE CONFIG TABLE FOR CRON SETTINGS
-- ===========================================

-- Create a simple config table to store Supabase URL and anon key
CREATE TABLE IF NOT EXISTS public.cron_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  supabase_url TEXT NOT NULL,
  anon_key TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on config table
ALTER TABLE public.cron_config ENABLE ROW LEVEL SECURITY;

-- Only service role can access config (for cron jobs)
-- Regular users cannot read or modify this
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cron_config' AND policyname = 'Service role only for cron_config') THEN
    CREATE POLICY "Service role only for cron_config"
    ON public.cron_config FOR ALL
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;

-- Create a SECURITY DEFINER function to get config (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_cron_config()
RETURNS TABLE(supabase_url TEXT, anon_key TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT supabase_url, anon_key FROM public.cron_config WHERE id = 'default';
$$;

-- Insert default values (UPDATE THESE WITH YOUR ACTUAL VALUES)
-- Replace 'ypmyzbtgossmizklszek' with your project ID
-- Replace 'YOUR_ANON_KEY' with your actual anon key from Supabase Dashboard
INSERT INTO public.cron_config (id, supabase_url, anon_key)
VALUES (
  'default',
  'https://ypmyzbtgossmizklszek.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwbXl6YnRnb3NzbWl6a2xzemVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NjYzMTYsImV4cCI6MjA4MjM0MjMxNn0.rYs4xutL53zMFdvDonyCxwfpGicrzIKAgo8-ohmPS6Q'  -- Updated with actual Anon Key
)
ON CONFLICT (id) DO UPDATE SET
  supabase_url = EXCLUDED.supabase_url,
  anon_key = EXCLUDED.anon_key,
  updated_at = NOW();

-- ===========================================
-- PART 3: SCHEDULE CLEANUP JOB
-- ===========================================

-- Schedule daily cleanup at 9 AM UTC
-- This will:
-- 1. Find cooldowns expired in last 24h and send notifications
-- 2. Delete cooldowns expired more than 7 days ago
SELECT cron.schedule(
  'cleanup-expired-cooldowns-daily',
  '0 9 * * *', -- Every day at 9:00 AM UTC
  $$
  SELECT net.http_post(
    url := (SELECT supabase_url FROM public.get_cron_config()) || '/functions/v1/cleanup-expired-cooldowns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT anon_key FROM public.get_cron_config())
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ===========================================
-- PART 4: UPDATE CONFIG VALUES
-- ===========================================

-- To update the Supabase URL and anon key, run:
-- UPDATE public.cron_config 
-- SET supabase_url = 'https://YOUR_PROJECT_ID.supabase.co',
--     anon_key = 'YOUR_ANON_KEY',
--     updated_at = NOW()
-- WHERE id = 'default';

-- ===========================================
-- PART 5: VERIFY CRON JOB
-- ===========================================

-- Query to check if cron job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-cooldowns-daily';

-- Query to view cron job execution history:
-- SELECT * FROM cron.job_run_details WHERE jobid = (
--   SELECT jobid FROM cron.job WHERE jobname = 'cleanup-expired-cooldowns-daily'
-- ) ORDER BY start_time DESC LIMIT 10;

-- ===========================================
-- PART 6: MANUAL CLEANUP (FOR TESTING)
-- ===========================================

-- To manually trigger the cleanup function for testing:
-- SELECT net.http_post(
--   url := (SELECT supabase_url FROM public.get_cron_config()) || '/functions/v1/cleanup-expired-cooldowns',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer ' || (SELECT anon_key FROM public.get_cron_config())
--   ),
--   body := '{}'::jsonb
-- ) AS request_id;

-- ===========================================
-- PART 7: UNSCHEDULE (IF NEEDED)
-- ===========================================

-- To remove the cron job:
-- SELECT cron.unschedule('cleanup-expired-cooldowns-daily');

-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for email cooldown cleanup';
COMMENT ON EXTENSION pg_net IS 'HTTP client for PostgreSQL - used to call edge functions';

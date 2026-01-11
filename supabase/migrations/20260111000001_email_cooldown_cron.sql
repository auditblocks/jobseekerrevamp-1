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
-- PART 2: SCHEDULE CLEANUP JOB
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
    url := current_setting('app.settings.supabase_url') || '/functions/v1/cleanup-expired-cooldowns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ===========================================
-- PART 3: CONFIGURATION SETTINGS
-- ===========================================

-- Note: You need to set these configuration values manually:
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_ID.supabase.co';
-- ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'YOUR_ANON_KEY';

-- ===========================================
-- PART 4: VERIFY CRON JOB
-- ===========================================

-- Query to check if cron job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-cooldowns-daily';

-- Query to view cron job execution history:
-- SELECT * FROM cron.job_run_details WHERE jobid = (
--   SELECT jobid FROM cron.job WHERE jobname = 'cleanup-expired-cooldowns-daily'
-- ) ORDER BY start_time DESC LIMIT 10;

-- ===========================================
-- PART 5: MANUAL CLEANUP (FOR TESTING)
-- ===========================================

-- To manually trigger the cleanup function for testing:
-- SELECT net.http_post(
--   url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/cleanup-expired-cooldowns',
--   headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
--   body := '{}'::jsonb
-- ) AS request_id;

-- ===========================================
-- PART 6: UNSCHEDULE (IF NEEDED)
-- ===========================================

-- To remove the cron job:
-- SELECT cron.unschedule('cleanup-expired-cooldowns-daily');

-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for email cooldown cleanup';
COMMENT ON EXTENSION pg_net IS 'HTTP client for PostgreSQL - used to call edge functions';

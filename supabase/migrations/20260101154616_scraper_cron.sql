-- =====================================================
-- DAILY AUTO-SCRAPE CRON JOB
-- =====================================================
-- Schedule daily recruiter scraping at 2 AM UTC
-- Note: This requires pg_cron extension to be enabled in Supabase
-- If pg_cron is not available, set up the cron job manually using:
-- 1. External cron service (cron-job.org, etc.)
-- 2. Supabase Dashboard → Database → Cron Jobs (if available)
-- 3. Or call auto-scrape-recruiters function manually

-- Uncomment the following if pg_cron is enabled:
/*
SELECT cron.schedule(
  'daily-recruiter-scrape',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ypmyzbtgossmizklszek.supabase.co/functions/v1/auto-scrape-recruiters',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
*/

-- Instructions for manual setup:
-- 1. Get your Supabase anon key from Settings → API
-- 2. Replace YOUR_ANON_KEY in the headers above
-- 3. Use an external cron service to call:
--    POST https://ypmyzbtgossmizklszek.supabase.co/functions/v1/auto-scrape-recruiters
--    Headers: Authorization: Bearer YOUR_ANON_KEY
--    Schedule: Daily at 2 AM UTC


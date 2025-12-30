-- Setup cron job for subscription expiry check
-- 
-- IMPORTANT: pg_cron extension is NOT available in Supabase by default.
-- This migration file is for reference only.
-- 
-- To set up the cron job, use an EXTERNAL cron service instead:
-- 1. Go to https://cron-job.org (or similar service)
-- 2. Create a new cron job with:
--    - URL: https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-subscription-expiry
--    - Method: POST
--    - Schedule: Daily at 00:00 UTC (0 0 * * *)
--    - Headers: Content-Type: application/json
--
-- Alternative: Use GitHub Actions, Vercel Cron, or other cloud cron services
--
-- If you have pg_cron enabled in your Supabase instance, uncomment below:

/*
-- Enable pg_cron extension (if available)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily subscription expiry check at midnight UTC
SELECT cron.schedule(
  'check-subscription-expiry',
  '0 0 * * *', -- Daily at midnight UTC
  $$
  SELECT net.http_post(
    url := 'https://ypmyzbtgossmizklszek.supabase.co/functions/v1/check-subscription-expiry',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule a job:
-- SELECT cron.unschedule('check-subscription-expiry');
*/


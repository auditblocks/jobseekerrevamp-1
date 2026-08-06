-- Schedules the lifecycle-reengagement-emails edge function to run once daily.
-- This is the automated fix for "user signs up, gets stuck mid-setup, and nothing
-- ever brings them back" — see the edge function's header comment for details.
--
-- Run time: 13:00 UTC (~18:30 IST) — clear of the Naukri/LinkedIn sync windows.
--
-- Requirements (already relied on by other cron jobs in this project):
-- - pg_cron + pg_net enabled
-- - app.settings.supabase_url configured
-- - app.settings.service_role_key configured

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('lifecycle-reengagement-emails-daily');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Unschedule skipped for lifecycle-reengagement-emails-daily: %', SQLERRM;
  END;

  PERFORM cron.schedule(
    'lifecycle-reengagement-emails-daily',
    '0 13 * * *',
    $_$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/lifecycle-reengagement-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
    $_$
  );
END;
$$;

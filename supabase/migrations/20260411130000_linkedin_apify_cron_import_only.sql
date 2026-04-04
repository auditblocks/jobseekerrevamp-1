-- Cron: import latest successful LinkedIn Apify dataset only (no new actor run).
-- Requires a prior successful LinkedIn scraper run; same pattern as Naukri import_only.
-- Staggered 1h after Naukri jobs (3/9/15 UTC → 4/10/16 UTC) to reduce overlap.
DO $$
BEGIN
  PERFORM cron.unschedule('linkedin-apify-sync-utc-04');
  PERFORM cron.unschedule('linkedin-apify-sync-utc-10');
  PERFORM cron.unschedule('linkedin-apify-sync-utc-16');
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'LinkedIn cron unschedule: %', SQLERRM;
END;
$$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'linkedin-apify-sync-utc-04',
    '0 4 * * *',
    $_$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-linkedin-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{"import_only": true}'::jsonb
    );
    $_$
  );

  PERFORM cron.schedule(
    'linkedin-apify-sync-utc-10',
    '0 10 * * *',
    $_$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-linkedin-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{"import_only": true}'::jsonb
    );
    $_$
  );

  PERFORM cron.schedule(
    'linkedin-apify-sync-utc-16',
    '0 16 * * *',
    $_$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-linkedin-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{"import_only": true}'::jsonb
    );
    $_$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'LinkedIn Apify cron not scheduled: %', SQLERRM;
END;
$$;

-- Cron: import latest successful dataset only (no new actor run). Manual "Run sync" still starts a run.
DO $$
BEGIN
  PERFORM cron.unschedule('naukri-apify-sync-utc-03');
  PERFORM cron.unschedule('naukri-apify-sync-utc-09');
  PERFORM cron.unschedule('naukri-apify-sync-utc-15');
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Naukri cron unschedule: %', SQLERRM;
END;
$$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'naukri-apify-sync-utc-03',
    '0 3 * * *',
    $_$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-naukri-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{"import_only": true}'::jsonb
    );
    $_$
  );

  PERFORM cron.schedule(
    'naukri-apify-sync-utc-09',
    '0 9 * * *',
    $_$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-naukri-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{"import_only": true}'::jsonb
    );
    $_$
  );

  PERFORM cron.schedule(
    'naukri-apify-sync-utc-15',
    '0 15 * * *',
    $_$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-naukri-apify',
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
    RAISE NOTICE 'Naukri Apify cron not scheduled: %', SQLERRM;
END;
$$;

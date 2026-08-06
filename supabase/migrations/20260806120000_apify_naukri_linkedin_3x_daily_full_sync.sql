-- Change Naukri + LinkedIn Apify full syncs from 5x/day back to 3x/day.
-- Full sync mode runs actor + imports dataset into `naukri_jobs` (is_active
-- defaults true, so new jobs appear immediately in the private jobs listing).
--
-- Naukri run slots (UTC):    01:00, 09:00, 17:00
-- Naukri run slots (IST):    06:30, 14:30, 22:30
-- LinkedIn run slots (UTC):  01:20, 09:20, 17:20   (staggered 20 min after Naukri)
-- LinkedIn run slots (IST):  06:50, 14:50, 22:50
--
-- Requirements:
-- - pg_cron + pg_net enabled
-- - app.settings.supabase_url configured
-- - app.settings.service_role_key configured

DO $$
DECLARE
  job_name text;
BEGIN
  -- Remove the 5x/day schedule this migration replaces.
  FOREACH job_name IN ARRAY ARRAY[
    'naukri-apify-sync-utc-0030',
    'naukri-apify-sync-utc-0330',
    'naukri-apify-sync-utc-0630',
    'naukri-apify-sync-utc-0930',
    'naukri-apify-sync-utc-1230',
    'linkedin-apify-sync-utc-0050',
    'linkedin-apify-sync-utc-0350',
    'linkedin-apify-sync-utc-0650',
    'linkedin-apify-sync-utc-0950',
    'linkedin-apify-sync-utc-1250'
  ]
  LOOP
    BEGIN
      PERFORM cron.unschedule(job_name);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Unschedule skipped for %: %', job_name, SQLERRM;
    END;
  END LOOP;

  -- Remove any previously-created 3x schedule names to keep migration idempotent.
  FOREACH job_name IN ARRAY ARRAY[
    'naukri-apify-sync-utc-0100',
    'naukri-apify-sync-utc-0900',
    'naukri-apify-sync-utc-1700',
    'linkedin-apify-sync-utc-0120',
    'linkedin-apify-sync-utc-0920',
    'linkedin-apify-sync-utc-1720'
  ]
  LOOP
    BEGIN
      PERFORM cron.unschedule(job_name);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Unschedule skipped for %: %', job_name, SQLERRM;
    END;
  END LOOP;
END;
$$;

DO $$
BEGIN
  -- Naukri full sync (actor run + import), 3x daily.
  PERFORM cron.schedule(
    'naukri-apify-sync-utc-0100',
    '0 1 * * *',
    $_$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-naukri-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
    $_$
  );

  PERFORM cron.schedule(
    'naukri-apify-sync-utc-0900',
    '0 9 * * *',
    $_$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-naukri-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
    $_$
  );

  PERFORM cron.schedule(
    'naukri-apify-sync-utc-1700',
    '0 17 * * *',
    $_$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-naukri-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
    $_$
  );

  -- LinkedIn full sync (actor run + import), staggered 20 minutes after Naukri, 3x daily.
  PERFORM cron.schedule(
    'linkedin-apify-sync-utc-0120',
    '20 1 * * *',
    $_$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-linkedin-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
    $_$
  );

  PERFORM cron.schedule(
    'linkedin-apify-sync-utc-0920',
    '20 9 * * *',
    $_$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-linkedin-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
    $_$
  );

  PERFORM cron.schedule(
    'linkedin-apify-sync-utc-1720',
    '20 17 * * *',
    $_$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-linkedin-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
    $_$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Apify 3x daily cron schedule not applied: %', SQLERRM;
END;
$$;

-- Schedule Naukri + LinkedIn Apify full syncs 5 times daily.
-- Full sync mode runs actor + imports dataset into `naukri_jobs`.
-- Times are defined in UTC and mapped to IST in comments below.
--
-- Naukri run slots (UTC):    00:30, 03:30, 06:30, 09:30, 12:30
-- Naukri run slots (IST):    06:00, 09:00, 12:00, 15:00, 18:00
-- LinkedIn run slots (UTC):  00:50, 03:50, 06:50, 09:50, 12:50
-- LinkedIn run slots (IST):  06:20, 09:20, 12:20, 15:20, 18:20
--
-- Requirements:
-- - pg_cron + pg_net enabled
-- - app.settings.supabase_url configured
-- - app.settings.service_role_key configured

DO $$
DECLARE
  job_name text;
BEGIN
  -- Remove previous 3x/day schedules (legacy names).
  FOREACH job_name IN ARRAY ARRAY[
    'naukri-apify-sync-utc-03',
    'naukri-apify-sync-utc-09',
    'naukri-apify-sync-utc-15',
    'linkedin-apify-sync-utc-04',
    'linkedin-apify-sync-utc-10',
    'linkedin-apify-sync-utc-16'
  ]
  LOOP
    BEGIN
      PERFORM cron.unschedule(job_name);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Unschedule skipped for %: %', job_name, SQLERRM;
    END;
  END LOOP;

  -- Remove any previously-created 5x schedule names to keep migration idempotent.
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
END;
$$;

DO $$
BEGIN
  -- Naukri full sync (actor run + import)
  PERFORM cron.schedule(
    'naukri-apify-sync-utc-0030',
    '30 0 * * *',
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
    'naukri-apify-sync-utc-0330',
    '30 3 * * *',
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
    'naukri-apify-sync-utc-0630',
    '30 6 * * *',
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
    'naukri-apify-sync-utc-0930',
    '30 9 * * *',
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
    'naukri-apify-sync-utc-1230',
    '30 12 * * *',
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

  -- LinkedIn full sync (actor run + import), staggered 20 minutes after Naukri.
  PERFORM cron.schedule(
    'linkedin-apify-sync-utc-0050',
    '50 0 * * *',
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
    'linkedin-apify-sync-utc-0350',
    '50 3 * * *',
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
    'linkedin-apify-sync-utc-0650',
    '50 6 * * *',
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
    'linkedin-apify-sync-utc-0950',
    '50 9 * * *',
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
    'linkedin-apify-sync-utc-1250',
    '50 12 * * *',
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
    RAISE NOTICE 'Apify 5x daily cron schedule not applied: %', SQLERRM;
END;
$$;

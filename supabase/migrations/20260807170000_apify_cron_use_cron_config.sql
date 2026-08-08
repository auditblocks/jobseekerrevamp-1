-- Fix Apify (Naukri + LinkedIn) pg_cron jobs.
--
-- Hosted Supabase rejects custom GUCs like app.settings.supabase_url /
-- app.settings.service_role_key ("permission denied to set parameter").
-- The working cooldown cron already uses public.cron_config via
-- get_cron_config(). Mirror that pattern with a service-role helper that is
-- NOT granted to anon/authenticated (service_role_key must stay private).
--
-- After this migration, set the key once in SQL Editor / CLI (do not commit it):
--   UPDATE public.cron_config
--   SET service_role_key = '<SERVICE_ROLE_KEY>', updated_at = now()
--   WHERE id = 'default';

ALTER TABLE public.cron_config
  ADD COLUMN IF NOT EXISTS service_role_key text;

COMMENT ON COLUMN public.cron_config.service_role_key IS
  'Supabase service_role JWT used by pg_cron → edge function calls that require admin/service auth. Never expose via client-callable RPCs.';

CREATE OR REPLACE FUNCTION public.get_service_cron_config()
RETURNS TABLE(supabase_url text, service_role_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.supabase_url, c.service_role_key
  FROM public.cron_config c
  WHERE c.id = 'default';
$$;

COMMENT ON FUNCTION public.get_service_cron_config() IS
  'Returns URL + service_role_key for pg_cron HTTP triggers. Execute revoked from PUBLIC.';

REVOKE ALL ON FUNCTION public.get_service_cron_config() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_service_cron_config() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_service_cron_config() TO postgres;
GRANT EXECUTE ON FUNCTION public.get_service_cron_config() TO service_role;

-- Recreate Apify full-sync schedules (3x/day) using cron_config instead of GUCs.
DO $$
DECLARE
  job_name text;
BEGIN
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
  -- Naukri full sync, 3x daily (UTC 01:00 / 09:00 / 17:00 → IST 06:30 / 14:30 / 22:30)
  PERFORM cron.schedule(
    'naukri-apify-sync-utc-0100',
    '0 1 * * *',
    $_$
    SELECT net.http_post(
      url := (SELECT supabase_url FROM public.get_service_cron_config()) || '/functions/v1/sync-naukri-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT service_role_key FROM public.get_service_cron_config())
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
      url := (SELECT supabase_url FROM public.get_service_cron_config()) || '/functions/v1/sync-naukri-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT service_role_key FROM public.get_service_cron_config())
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
      url := (SELECT supabase_url FROM public.get_service_cron_config()) || '/functions/v1/sync-naukri-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT service_role_key FROM public.get_service_cron_config())
      ),
      body := '{}'::jsonb
    );
    $_$
  );

  -- LinkedIn full sync, staggered +20 min
  PERFORM cron.schedule(
    'linkedin-apify-sync-utc-0120',
    '20 1 * * *',
    $_$
    SELECT net.http_post(
      url := (SELECT supabase_url FROM public.get_service_cron_config()) || '/functions/v1/sync-linkedin-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT service_role_key FROM public.get_service_cron_config())
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
      url := (SELECT supabase_url FROM public.get_service_cron_config()) || '/functions/v1/sync-linkedin-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT service_role_key FROM public.get_service_cron_config())
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
      url := (SELECT supabase_url FROM public.get_service_cron_config()) || '/functions/v1/sync-linkedin-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT service_role_key FROM public.get_service_cron_config())
      ),
      body := '{}'::jsonb
    );
    $_$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Apify cron reschedule failed: %', SQLERRM;
END;
$$;

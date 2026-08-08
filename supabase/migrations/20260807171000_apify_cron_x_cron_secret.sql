-- Point Apify + lifecycle crons at x-cron-secret auth.
-- Edge functions compare Authorization bearer to SUPABASE_SERVICE_ROLE_KEY, but
-- hosted projects may inject a different key format than the legacy JWT stored for
-- cron. admin-auth already accepts x-cron-secret = NAUKRI_SYNC_CRON_SECRET.

ALTER TABLE public.cron_config
  ADD COLUMN IF NOT EXISTS cron_secret text;

COMMENT ON COLUMN public.cron_config.cron_secret IS
  'Shared secret sent as x-cron-secret; must match edge secret NAUKRI_SYNC_CRON_SECRET.';

-- Recreate helper with cron_secret in the return type (OR REPLACE cannot change OUT cols).
DROP FUNCTION IF EXISTS public.get_service_cron_config();

CREATE FUNCTION public.get_service_cron_config()
RETURNS TABLE(supabase_url text, service_role_key text, cron_secret text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.supabase_url, c.service_role_key, c.cron_secret
  FROM public.cron_config c
  WHERE c.id = 'default';
$$;

COMMENT ON FUNCTION public.get_service_cron_config() IS
  'Returns URL + service_role_key + cron_secret for pg_cron HTTP triggers. Execute revoked from PUBLIC.';

REVOKE ALL ON FUNCTION public.get_service_cron_config() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_service_cron_config() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_service_cron_config() TO postgres;
GRANT EXECUTE ON FUNCTION public.get_service_cron_config() TO service_role;

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
    'linkedin-apify-sync-utc-1720',
    'lifecycle-reengagement-emails-daily'
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
  PERFORM cron.schedule(
    'naukri-apify-sync-utc-0100',
    '0 1 * * *',
    $_$
    SELECT net.http_post(
      url := (SELECT supabase_url FROM public.get_service_cron_config()) || '/functions/v1/sync-naukri-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT service_role_key FROM public.get_service_cron_config()),
        'apikey', (SELECT service_role_key FROM public.get_service_cron_config()),
        'x-cron-secret', (SELECT cron_secret FROM public.get_service_cron_config())
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
        'Authorization', 'Bearer ' || (SELECT service_role_key FROM public.get_service_cron_config()),
        'apikey', (SELECT service_role_key FROM public.get_service_cron_config()),
        'x-cron-secret', (SELECT cron_secret FROM public.get_service_cron_config())
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
        'Authorization', 'Bearer ' || (SELECT service_role_key FROM public.get_service_cron_config()),
        'apikey', (SELECT service_role_key FROM public.get_service_cron_config()),
        'x-cron-secret', (SELECT cron_secret FROM public.get_service_cron_config())
      ),
      body := '{}'::jsonb
    );
    $_$
  );

  PERFORM cron.schedule(
    'linkedin-apify-sync-utc-0120',
    '20 1 * * *',
    $_$
    SELECT net.http_post(
      url := (SELECT supabase_url FROM public.get_service_cron_config()) || '/functions/v1/sync-linkedin-apify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT service_role_key FROM public.get_service_cron_config()),
        'apikey', (SELECT service_role_key FROM public.get_service_cron_config()),
        'x-cron-secret', (SELECT cron_secret FROM public.get_service_cron_config())
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
        'Authorization', 'Bearer ' || (SELECT service_role_key FROM public.get_service_cron_config()),
        'apikey', (SELECT service_role_key FROM public.get_service_cron_config()),
        'x-cron-secret', (SELECT cron_secret FROM public.get_service_cron_config())
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
        'Authorization', 'Bearer ' || (SELECT service_role_key FROM public.get_service_cron_config()),
        'apikey', (SELECT service_role_key FROM public.get_service_cron_config()),
        'x-cron-secret', (SELECT cron_secret FROM public.get_service_cron_config())
      ),
      body := '{}'::jsonb
    );
    $_$
  );

  PERFORM cron.schedule(
    'lifecycle-reengagement-emails-daily',
    '0 13 * * *',
    $_$
    SELECT net.http_post(
      url := (SELECT supabase_url FROM public.get_service_cron_config()) || '/functions/v1/lifecycle-reengagement-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT service_role_key FROM public.get_service_cron_config()),
        'apikey', (SELECT service_role_key FROM public.get_service_cron_config()),
        'x-cron-secret', (SELECT cron_secret FROM public.get_service_cron_config())
      ),
      body := '{}'::jsonb
    );
    $_$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Cron reschedule with x-cron-secret failed: %', SQLERRM;
END;
$$;

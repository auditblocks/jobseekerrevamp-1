-- Retarget lifecycle re-engagement cron to cron_config (same fix as Apify).
-- Hosted Supabase cannot set custom app.settings.* GUCs.

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
      url := (SELECT supabase_url FROM public.get_service_cron_config()) || '/functions/v1/lifecycle-reengagement-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT service_role_key FROM public.get_service_cron_config())
      ),
      body := '{}'::jsonb
    );
    $_$
  );
END;
$$;

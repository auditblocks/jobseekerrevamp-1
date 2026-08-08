-- Schedule notify-govt-job-alerts hourly. Uses the current cron auth pattern
-- (public.get_service_cron_config() + x-cron-secret) established by
-- 20260807171000_apify_cron_x_cron_secret.sql — hosted Supabase rejects the
-- older app.settings.* GUC approach.

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('notify-govt-job-alerts-hourly');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Unschedule skipped for notify-govt-job-alerts-hourly: %', SQLERRM;
  END;

  PERFORM cron.schedule(
    'notify-govt-job-alerts-hourly',
    '15 * * * *',
    $_$
    SELECT net.http_post(
      url := (SELECT supabase_url FROM public.get_service_cron_config()) || '/functions/v1/notify-govt-job-alerts',
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
    RAISE NOTICE 'notify-govt-job-alerts cron schedule not applied: %', SQLERRM;
END;
$$;

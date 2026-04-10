CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.schedule(
  'expire-subscriptions-daily',
  '30 18 * * *',   -- 18:30 UTC = midnight IST
  $$
  UPDATE public.profiles
     SET subscription_tier = 'FREE',
         subscription_expires_at = NULL,
         updated_at = now()
   WHERE subscription_tier != 'FREE'
     AND subscription_expires_at IS NOT NULL
     AND subscription_expires_at < now();
  $$
);

-- Deleting a user from auth.users was blocked by FKs with default NO ACTION.
-- Set nullable admin audit columns to SET NULL so Auth Admin API delete can succeed.

ALTER TABLE public.push_notification_campaigns
  DROP CONSTRAINT IF EXISTS push_notification_campaigns_created_by_fkey;

ALTER TABLE public.push_notification_campaigns
  ADD CONSTRAINT push_notification_campaigns_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.system_settings
  DROP CONSTRAINT IF EXISTS system_settings_updated_by_fkey;

ALTER TABLE public.system_settings
  ADD CONSTRAINT system_settings_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

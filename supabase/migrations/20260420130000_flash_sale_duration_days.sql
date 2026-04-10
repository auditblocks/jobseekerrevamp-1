ALTER TABLE public.flash_sale_config
ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 730;

COMMENT ON COLUMN public.flash_sale_config.duration_days
IS 'Subscription length in days for new Elite purchases. Applied at checkout time; does not affect existing members.';

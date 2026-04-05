-- Migration to shift 5-year config to pure Flash Sale config.
ALTER TABLE public.subscription_plans 
DROP COLUMN IF EXISTS five_year_price;

ALTER TABLE public.flash_sale_config 
ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 1999;

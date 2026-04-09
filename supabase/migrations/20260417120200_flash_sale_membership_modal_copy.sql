-- Headline + subheadline on "View Membership Details" modal (FlashSalePopup)
ALTER TABLE public.flash_sale_config
ADD COLUMN IF NOT EXISTS modal_headline_prefix TEXT NOT NULL DEFAULT 'Unleash Your';

ALTER TABLE public.flash_sale_config
ADD COLUMN IF NOT EXISTS modal_headline_accent TEXT NOT NULL DEFAULT 'Full Potential';

ALTER TABLE public.flash_sale_config
ADD COLUMN IF NOT EXISTS modal_subheadline TEXT NOT NULL DEFAULT 'Excellence Unlocked: The Ultimate 5-Year Experience';

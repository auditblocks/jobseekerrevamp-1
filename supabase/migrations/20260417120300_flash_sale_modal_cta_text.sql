-- Primary checkout CTA on "View Membership Details" full-screen modal
ALTER TABLE public.flash_sale_config
ADD COLUMN IF NOT EXISTS modal_cta_text TEXT NOT NULL DEFAULT 'SECURE MY 5-YEAR PLAN';

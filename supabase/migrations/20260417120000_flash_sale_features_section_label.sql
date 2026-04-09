-- Admin-configurable heading above Elite / flash sale benefit bullets
ALTER TABLE public.flash_sale_config
ADD COLUMN IF NOT EXISTS features_section_label TEXT NOT NULL DEFAULT '5-Year Benefits / Features';

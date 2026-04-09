-- Gold caption under sale + compare price in Elite membership details modal
ALTER TABLE public.flash_sale_config
ADD COLUMN IF NOT EXISTS price_tagline TEXT NOT NULL DEFAULT 'Limited Time 5-Year Access • Non-Renewable';

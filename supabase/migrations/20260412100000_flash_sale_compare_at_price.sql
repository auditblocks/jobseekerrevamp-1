-- Strikethrough / "was" price shown next to flash sale price in the popup (admin-configurable).
ALTER TABLE public.flash_sale_config
ADD COLUMN IF NOT EXISTS compare_at_price INTEGER NOT NULL DEFAULT 4999;

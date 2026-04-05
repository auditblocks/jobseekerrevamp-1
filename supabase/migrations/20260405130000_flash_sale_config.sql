-- Create Flash Sale Configuration table
CREATE TABLE IF NOT EXISTS public.flash_sale_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    title TEXT NOT NULL DEFAULT 'FLASH SALE!',
    subtitle TEXT NOT NULL DEFAULT 'Special Anniversary Offer',
    offer_text TEXT NOT NULL DEFAULT '5 Years for ₹1999',
    end_time TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '2 hours 45 minutes'),
    progress_percentage INTEGER NOT NULL DEFAULT 80,
    button_text TEXT NOT NULL DEFAULT 'Claim Offer Now',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.flash_sale_config ENABLE ROW LEVEL SECURITY;

-- Creating policies
CREATE POLICY "Public can view flash sale config" 
    ON public.flash_sale_config 
    FOR SELECT 
    USING (true);

CREATE POLICY "Admins can manage flash sale config" 
    ON public.flash_sale_config 
    FOR ALL 
    USING (is_superadmin() = true);

-- Insert initial single row if not exists
INSERT INTO public.flash_sale_config (id, is_active)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', false
WHERE NOT EXISTS (SELECT 1 FROM public.flash_sale_config);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_flash_sale_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER flash_sale_config_updated_at
    BEFORE UPDATE ON public.flash_sale_config
    FOR EACH ROW
    EXECUTE FUNCTION update_flash_sale_updated_at();

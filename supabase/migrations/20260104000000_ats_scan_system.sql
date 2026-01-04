-- =====================================================
-- ATS SCAN SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ats_scan_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ats_scan_settings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ats_scan_settings_key ON public.ats_scan_settings(setting_key);

-- RLS Policies for ats_scan_settings
-- Anyone can read settings
CREATE POLICY "Anyone can read scan settings"
    ON public.ats_scan_settings FOR SELECT
    USING (true);

-- Only superadmins can manage settings
CREATE POLICY "Superadmins can insert scan settings"
    ON public.ats_scan_settings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'superadmin'
        )
    );

CREATE POLICY "Superadmins can update scan settings"
    ON public.ats_scan_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'superadmin'
        )
    );

CREATE POLICY "Superadmins can delete scan settings"
    ON public.ats_scan_settings FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'superadmin'
        )
    );

-- Insert default scan price (99 INR in paise = 9900)
INSERT INTO public.ats_scan_settings (setting_key, setting_value)
VALUES ('scan_price', '{"amount": 99, "currency": "INR"}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- UPDATE RESUME_ANALYSES TABLE
-- =====================================================
-- Add new columns for payment tracking
ALTER TABLE public.resume_analyses
ADD COLUMN IF NOT EXISTS resume_file_name TEXT,
ADD COLUMN IF NOT EXISTS resume_content TEXT,
ADD COLUMN IF NOT EXISTS analysis_result JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
ADD COLUMN IF NOT EXISTS amount_paid INTEGER DEFAULT 0;

-- Create index for payment status
CREATE INDEX IF NOT EXISTS idx_resume_analyses_payment_status ON public.resume_analyses(payment_status);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_razorpay_order_id ON public.resume_analyses(razorpay_order_id);

-- Update RLS policies to allow users to CRUD their own analyses
-- (Policies already exist, but ensuring they cover new columns)
-- No changes needed as existing policies use user_id which covers all columns

-- =====================================================
-- FUNCTION TO UPDATE UPDATED_AT TIMESTAMP
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_ats_scan_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ats_scan_settings updated_at
DROP TRIGGER IF EXISTS update_ats_scan_settings_updated_at ON public.ats_scan_settings;
CREATE TRIGGER update_ats_scan_settings_updated_at
    BEFORE UPDATE ON public.ats_scan_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ats_scan_settings_updated_at();


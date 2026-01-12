-- ============================================
-- SYSTEM SETTINGS & CONFIGURABLE COOLDOWN
-- ============================================

-- 1. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Insert default email cooldown setting (7 days)
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
    'email_cooldown_days', 
    '7'::jsonb, 
    'Number of days before a user can email the same recruiter again'
)
ON CONFLICT (setting_key) DO NOTHING;

-- 3. Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Everyone (authenticated) can read settings
CREATE POLICY "Authenticated users can read settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
ON public.system_settings FOR UPDATE
USING (public.is_superadmin());

CREATE POLICY "Admins can insert settings"
ON public.system_settings FOR INSERT
WITH CHECK (public.is_superadmin());

-- 5. Helper function to get setting value safely
CREATE OR REPLACE FUNCTION public.get_system_setting(p_key TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT setting_value FROM public.system_settings WHERE setting_key = p_key;
$$;

COMMENT ON TABLE public.system_settings IS 'Global system configuration settings';

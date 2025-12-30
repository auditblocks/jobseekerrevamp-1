-- Dashboard Configuration Table
-- Allows admins to configure dashboard statistics displayed to users
CREATE TABLE IF NOT EXISTS public.dashboard_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.dashboard_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view dashboard config"
    ON public.dashboard_config
    FOR SELECT
    USING (is_superadmin());

CREATE POLICY "Admins can insert dashboard config"
    ON public.dashboard_config
    FOR INSERT
    WITH CHECK (is_superadmin());

CREATE POLICY "Admins can update dashboard config"
    ON public.dashboard_config
    FOR UPDATE
    USING (is_superadmin())
    WITH CHECK (is_superadmin());

CREATE POLICY "Admins can delete dashboard config"
    ON public.dashboard_config
    FOR DELETE
    USING (is_superadmin());

-- Public read policy for active configs
CREATE POLICY "Public can view active dashboard config"
    ON public.dashboard_config
    FOR SELECT
    USING (is_active = true);

-- Index
CREATE INDEX idx_dashboard_config_key ON public.dashboard_config(config_key);
CREATE INDEX idx_dashboard_config_active ON public.dashboard_config(is_active);

-- Insert default dashboard stats configuration
INSERT INTO public.dashboard_config (config_key, config_value, display_order, is_active) VALUES
('emails_sent', '{"label": "Emails Sent", "value": 248, "icon": "Send", "color": "text-accent", "bg": "bg-accent/10"}'::jsonb, 1, true),
('emails_opened', '{"label": "Opened", "value": 156, "icon": "Eye", "color": "text-success", "bg": "bg-success/10"}'::jsonb, 2, true),
('emails_replied', '{"label": "Replies", "value": 67, "icon": "MessageSquare", "color": "text-primary", "bg": "bg-primary/10"}'::jsonb, 3, true),
('applications', '{"label": "Applications", "value": 12, "icon": "Briefcase", "color": "text-warning", "bg": "bg-warning/10"}'::jsonb, 4, true)
ON CONFLICT (config_key) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dashboard_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dashboard_config_updated_at
    BEFORE UPDATE ON public.dashboard_config
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_config_updated_at();


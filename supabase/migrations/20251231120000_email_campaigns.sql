-- =====================================================
-- EMAIL CAMPAIGNS SYSTEM
-- =====================================================

-- =====================================================
-- 1. EMAIL CAMPAIGNS TABLE
-- =====================================================
CREATE TABLE public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT,
    from_name TEXT DEFAULT 'JobSeeker',
    from_email TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed', 'cancelled')),
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_email_campaigns_created_by ON public.email_campaigns(created_by);
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX idx_email_campaigns_created_at ON public.email_campaigns(created_at DESC);

-- =====================================================
-- 2. EMAIL CAMPAIGN RECIPIENTS TABLE
-- =====================================================
CREATE TABLE public.email_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    tracking_pixel_id TEXT,
    click_tracking_id TEXT,
    resend_email_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_email_campaign_recipients_campaign_id ON public.email_campaign_recipients(campaign_id);
CREATE INDEX idx_email_campaign_recipients_user_id ON public.email_campaign_recipients(user_id);
CREATE INDEX idx_email_campaign_recipients_status ON public.email_campaign_recipients(status);
CREATE INDEX idx_email_campaign_recipients_tracking_pixel_id ON public.email_campaign_recipients(tracking_pixel_id);
CREATE INDEX idx_email_campaign_recipients_click_tracking_id ON public.email_campaign_recipients(click_tracking_id);

-- =====================================================
-- 3. EMAIL CAMPAIGN ATTACHMENTS TABLE
-- =====================================================
CREATE TABLE public.email_campaign_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.email_campaign_attachments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_email_campaign_attachments_campaign_id ON public.email_campaign_attachments(campaign_id);

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

-- Email Campaigns: Admins can view/create/update all campaigns
CREATE POLICY "Admins can view all email campaigns" ON public.email_campaigns
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

CREATE POLICY "Admins can create email campaigns" ON public.email_campaigns
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

CREATE POLICY "Admins can update email campaigns" ON public.email_campaigns
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

CREATE POLICY "Admins can delete email campaigns" ON public.email_campaigns
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

-- Email Campaign Recipients: Admins can view all, users can view their own
CREATE POLICY "Admins can view all campaign recipients" ON public.email_campaign_recipients
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

CREATE POLICY "Users can view their own campaign recipients" ON public.email_campaign_recipients
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can insert campaign recipients" ON public.email_campaign_recipients
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

CREATE POLICY "Admins can update campaign recipients" ON public.email_campaign_recipients
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

-- Email Campaign Attachments: Admins can manage all attachments
CREATE POLICY "Admins can view all campaign attachments" ON public.email_campaign_attachments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

CREATE POLICY "Admins can create campaign attachments" ON public.email_campaign_attachments
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

CREATE POLICY "Admins can delete campaign attachments" ON public.email_campaign_attachments
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

-- =====================================================
-- 5. UPDATE TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_email_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_campaigns_updated_at
    BEFORE UPDATE ON public.email_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_email_campaigns_updated_at();

CREATE OR REPLACE FUNCTION public.update_email_campaign_recipients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_campaign_recipients_updated_at
    BEFORE UPDATE ON public.email_campaign_recipients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_email_campaign_recipients_updated_at();


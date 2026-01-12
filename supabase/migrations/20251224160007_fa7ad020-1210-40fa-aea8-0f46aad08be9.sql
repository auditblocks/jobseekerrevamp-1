-- =====================================================
-- ANALYTICS TABLES
-- =====================================================

-- =====================================================
-- USER SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'tablet')),
    browser TEXT,
    last_activity_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT true,
    exit_page TEXT,
    exit_reason TEXT CHECK (exit_reason IN ('logout', 'timeout', 'close', 'error')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_is_active ON public.user_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions(last_activity_at DESC);
CREATE INDEX idx_user_sessions_started_at ON public.user_sessions(started_at DESC);

-- =====================================================
-- USER ACTIVITY EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.user_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'page_view', 'click', 'form_submit', 'button_click', 
        'link_click', 'scroll', 'focus', 'blur', 'input_change',
        'download', 'share', 'video_play', 'video_pause', 'custom'
    )),
    page_path TEXT NOT NULL,
    page_title TEXT,
    event_name TEXT,
    element_id TEXT,
    element_type TEXT,
    element_text TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_activity_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_activity_events_user_id ON public.user_activity_events(user_id);
CREATE INDEX idx_user_activity_events_session_id ON public.user_activity_events(session_id);
CREATE INDEX idx_user_activity_events_event_type ON public.user_activity_events(event_type);
CREATE INDEX idx_user_activity_events_created_at ON public.user_activity_events(created_at DESC);
CREATE INDEX idx_user_activity_events_page_path ON public.user_activity_events(page_path);

-- =====================================================
-- USER ENGAGEMENT METRICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_engagement_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    total_page_views INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_form_submits INTEGER DEFAULT 0,
    average_session_duration INTEGER DEFAULT 0,
    bounce_rate NUMERIC DEFAULT 0,
    pages_per_session NUMERIC DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, metric_date)
);

ALTER TABLE public.user_engagement_metrics ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_engagement_metrics_user_id ON public.user_engagement_metrics(user_id);
CREATE INDEX idx_user_engagement_metrics_metric_date ON public.user_engagement_metrics(metric_date);

-- =====================================================
-- PAGE ANALYTICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.page_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_path TEXT NOT NULL UNIQUE,
    page_title TEXT,
    view_count INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    average_time_on_page INTEGER DEFAULT 0,
    bounce_count INTEGER DEFAULT 0,
    exit_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_page_analytics_page_path ON public.page_analytics(page_path);

-- =====================================================
-- SYSTEM TABLES
-- =====================================================

-- =====================================================
-- NOTIFICATION CAMPAIGNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notification_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('all', 'subscription_tier', 'status', 'custom')),
    target_filters JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT
);

ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notification_campaigns_created_by ON public.notification_campaigns(created_by);
CREATE INDEX idx_notification_campaigns_status ON public.notification_campaigns(status);
CREATE INDEX idx_notification_campaigns_created_at ON public.notification_campaigns(created_at DESC);

-- =====================================================
-- NOTIFICATION RECIPIENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notification_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.notification_campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notification_recipients_campaign_id ON public.notification_recipients(campaign_id);
CREATE INDEX idx_notification_recipients_user_id ON public.notification_recipients(user_id);
CREATE INDEX idx_notification_recipients_status ON public.notification_recipients(status);

-- =====================================================
-- PUSH SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_is_active ON public.push_subscriptions(is_active) WHERE is_active = true;

-- =====================================================
-- PUSH NOTIFICATION CAMPAIGNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.push_notification_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    icon TEXT,
    badge TEXT,
    url TEXT DEFAULT '/',
    data JSONB,
    target_type TEXT DEFAULT 'all',
    target_filters JSONB,
    scheduled_at TIMESTAMPTZ,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0
);

ALTER TABLE public.push_notification_campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_push_notification_campaigns_status ON public.push_notification_campaigns(status);
CREATE INDEX idx_push_notification_campaigns_created_by ON public.push_notification_campaigns(created_by);

-- =====================================================
-- PUSH NOTIFICATION EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.push_notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.push_notification_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

ALTER TABLE public.push_notification_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_push_notification_events_campaign_id ON public.push_notification_events(campaign_id);
CREATE INDEX idx_push_notification_events_user_id ON public.push_notification_events(user_id);
CREATE INDEX idx_push_notification_events_event_type ON public.push_notification_events(event_type);

-- =====================================================
-- SCRAPING LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.scraping_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,
    records_found INTEGER DEFAULT 0,
    records_added INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scraping_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_scraping_logs_platform ON public.scraping_logs(platform);
CREATE INDEX idx_scraping_logs_created_at ON public.scraping_logs(created_at);

-- =====================================================
-- SCRAPER CONFIG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.scraper_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    quota_per_day INTEGER DEFAULT 100,
    rate_limit_per_minute INTEGER DEFAULT 10,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scraper_config ENABLE ROW LEVEL SECURITY;

-- Insert default scraper configs
INSERT INTO public.scraper_config (platform, is_enabled, quota_per_day, rate_limit_per_minute) VALUES
('linkedin', true, 100, 10),
('indeed', true, 100, 10),
('glassdoor', true, 100, 10),
('naukri', true, 100, 10);

-- =====================================================
-- DOMAIN RECRUITER REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.domain_recruiter_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('domain', 'recruiter')),
    domain_name TEXT,
    recruiter_name TEXT,
    recruiter_email TEXT,
    company_name TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.domain_recruiter_requests ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CHATBOT CONVERSATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SYSTEM CREDENTIALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.system_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_name TEXT NOT NULL UNIQUE,
    credentials JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_credentials ENABLE ROW LEVEL SECURITY;
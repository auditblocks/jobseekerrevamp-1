-- ============================================
-- COMPLETE SUPABASE DATABASE MIGRATION EXPORT
-- Generated from Lovable Cloud Project
-- ============================================

-- ===========================================
-- PART 1: ENUMS
-- ===========================================

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- ===========================================
-- PART 2: TABLES
-- ===========================================

-- Profiles table (core user data)
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    subscription_tier TEXT NOT NULL DEFAULT 'FREE',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    daily_emails_sent INTEGER NOT NULL DEFAULT 0,
    last_sent_date DATE,
    total_emails_sent INTEGER NOT NULL DEFAULT 0,
    successful_emails INTEGER NOT NULL DEFAULT 0,
    failed_emails INTEGER NOT NULL DEFAULT 0,
    google_refresh_token TEXT,
    gmail_token_refreshed_at TIMESTAMP WITH TIME ZONE,
    professional_title TEXT,
    bio TEXT,
    phone TEXT,
    location TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    resume_url TEXT,
    profile_photo_url TEXT,
    job_domains JSONB DEFAULT '[]'::jsonb,
    preferences JSONB DEFAULT '{"resume": null, "jobDomains": [], "gmailAddress": null}'::jsonb,
    permissions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Domains table
CREATE TABLE public.domains (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Subdomains table
CREATE TABLE public.subdomains (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    domain_id UUID NOT NULL REFERENCES public.domains(id),
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Recruiters table
CREATE TABLE public.recruiters (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    domain TEXT,
    subdomain_id UUID REFERENCES public.subdomains(id),
    tier TEXT,
    quality_score NUMERIC DEFAULT 0,
    response_rate NUMERIC DEFAULT 0,
    company_size TEXT,
    source_platform TEXT,
    last_contacted TIMESTAMP WITH TIME ZONE,
    scraped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Subscription plans table
CREATE TABLE public.subscription_plans (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    price INTEGER NOT NULL,
    old_price INTEGER,
    duration_days INTEGER NOT NULL DEFAULT 0,
    duration_unit TEXT NOT NULL DEFAULT 'days',
    daily_limit INTEGER NOT NULL DEFAULT 0,
    features TEXT[] NOT NULL DEFAULT '{}'::text[],
    max_features INTEGER,
    discount_percentage INTEGER,
    is_recommended BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    button_text TEXT,
    button_disabled_text TEXT,
    billing_cycle_display TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Subscription history table
CREATE TABLE public.subscription_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
    amount INTEGER NOT NULL,
    status TEXT NOT NULL,
    payment_id TEXT,
    payment_method TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email history table
CREATE TABLE public.email_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,
    domain TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email tracking table
CREATE TABLE public.email_tracking (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    email_id TEXT,
    tracking_pixel_id TEXT,
    domain TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    click_links JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email templates table
CREATE TABLE public.email_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT,
    industry TEXT,
    role TEXT,
    tags TEXT[],
    is_global BOOLEAN DEFAULT false,
    created_by TEXT DEFAULT 'user',
    usage_count INTEGER DEFAULT 0,
    rating NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conversation threads table
CREATE TABLE public.conversation_threads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    recruiter_email TEXT NOT NULL,
    recruiter_name TEXT,
    company_name TEXT,
    subject_line TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    total_messages INTEGER DEFAULT 0,
    user_messages_count INTEGER DEFAULT 0,
    recruiter_messages_count INTEGER DEFAULT 0,
    engagement_score INTEGER DEFAULT 0,
    response_rate NUMERIC DEFAULT 0,
    first_contact_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_user_message_at TIMESTAMP WITH TIME ZONE,
    last_recruiter_message_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conversation messages table
CREATE TABLE public.conversation_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES public.conversation_threads(id),
    email_history_id UUID REFERENCES public.email_history(id),
    follow_up_to_message_id UUID REFERENCES public.conversation_messages(id),
    sender_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_preview TEXT,
    body_full TEXT,
    message_number INTEGER NOT NULL,
    status TEXT DEFAULT 'sent',
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    is_follow_up BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Follow-up suggestions table
CREATE TABLE public.follow_up_suggestions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES public.conversation_threads(id),
    suggested_date TIMESTAMP WITH TIME ZONE NOT NULL,
    suggested_subject TEXT,
    suggested_body_preview TEXT,
    priority TEXT DEFAULT 'medium',
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    ai_generated BOOLEAN DEFAULT true,
    suggested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Job applications table
CREATE TABLE public.job_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    company_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    recruiter_email TEXT NOT NULL,
    recruiter_name TEXT,
    job_url TEXT,
    status TEXT DEFAULT 'applied',
    source TEXT DEFAULT 'email_outreach',
    notes TEXT,
    application_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    follow_up_date TIMESTAMP WITH TIME ZONE,
    response_received BOOLEAN DEFAULT false,
    response_date TIMESTAMP WITH TIME ZONE,
    interview_date TIMESTAMP WITH TIME ZONE,
    offer_amount NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Domain recruiter requests table
CREATE TABLE public.domain_recruiter_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    request_type TEXT NOT NULL,
    domain_name TEXT,
    recruiter_name TEXT,
    recruiter_email TEXT,
    company_name TEXT,
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notification campaigns table
CREATE TABLE public.notification_campaigns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_filters JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft',
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notification recipients table
CREATE TABLE public.notification_recipients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES public.notification_campaigns(id),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    user_email TEXT NOT NULL,
    user_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User notifications table
CREATE TABLE public.user_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    campaign_id UUID REFERENCES public.notification_campaigns(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Push notification campaigns table
CREATE TABLE public.push_notification_campaigns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by UUID,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    icon TEXT,
    badge TEXT,
    url TEXT DEFAULT '/',
    data JSONB,
    target_type TEXT DEFAULT 'all',
    target_filters JSONB,
    status TEXT DEFAULT 'draft',
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Push notification events table
CREATE TABLE public.push_notification_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES public.push_notification_campaigns(id),
    user_id UUID,
    event_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Push subscriptions table
CREATE TABLE public.push_subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    subscription JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chatbot conversations table
CREATE TABLE public.chatbot_conversations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    response TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User sessions table
CREATE TABLE public.user_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    session_token TEXT NOT NULL,
    browser TEXT,
    device_type TEXT,
    user_agent TEXT,
    ip_address TEXT,
    is_active BOOLEAN DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    exit_page TEXT,
    exit_reason TEXT,
    duration_seconds INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User activity events table
CREATE TABLE public.user_activity_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    session_id UUID REFERENCES public.user_sessions(id),
    event_type TEXT NOT NULL,
    event_name TEXT,
    page_path TEXT NOT NULL,
    page_title TEXT,
    element_type TEXT,
    element_id TEXT,
    element_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User engagement metrics table
CREATE TABLE public.user_engagement_metrics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    metric_date DATE NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    total_page_views INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_form_submits INTEGER DEFAULT 0,
    average_session_duration INTEGER DEFAULT 0,
    pages_per_session NUMERIC DEFAULT 0,
    bounce_rate NUMERIC DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Page analytics table
CREATE TABLE public.page_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    page_path TEXT NOT NULL,
    page_title TEXT,
    view_count INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    bounce_count INTEGER DEFAULT 0,
    exit_count INTEGER DEFAULT 0,
    average_time_on_page INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User resumes table
CREATE TABLE public.user_resumes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    version_name TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Scraper config table
CREATE TABLE public.scraper_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    platform TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    rate_limit_per_minute INTEGER DEFAULT 10,
    quota_per_day INTEGER DEFAULT 100,
    settings JSONB DEFAULT '{}'::jsonb,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_success_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Scraping logs table
CREATE TABLE public.scraping_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    platform TEXT NOT NULL,
    status TEXT DEFAULT 'running',
    records_found INTEGER DEFAULT 0,
    records_added INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- System credentials table
CREATE TABLE public.system_credentials (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_name TEXT NOT NULL,
    credentials JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===========================================
-- PART 3: DATABASE FUNCTIONS
-- ===========================================

-- Security definer function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check user_roles table for admin role
  IF EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;
  
  -- Fallback: Check JWT user_metadata for superadmin role
  IF COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'superadmin', false) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

-- Security definer function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

-- Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  RETURN new;
END;
$function$;

-- Admin function: Get all users
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(id uuid, name text, email text, role text, status text, subscription_tier text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access Denied: Not a superadmin.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.email,
    p.role,
    p.status,
    p.subscription_tier,
    p.created_at,
    au.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$function$;

-- Admin function: Get dashboard stats
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access Denied: Not a superadmin.';
  END IF;

  RETURN (
    SELECT json_build_object(
      'total_users', (SELECT count(*) FROM public.profiles),
      'active_subscriptions', (SELECT count(*) FROM public.profiles WHERE subscription_tier != 'FREE')
    )
  );
END;
$function$;

-- Admin function: Get user signups last 30 days
CREATE OR REPLACE FUNCTION public.admin_get_user_signups_last_30_days()
RETURNS TABLE(signup_date date, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access Denied: Not a superadmin.';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(
      date_trunc('day', now() - interval '29 days'),
      date_trunc('day', now()),
      '1 day'::interval
    )::date AS day
  )
  SELECT
    d.day AS signup_date,
    count(p.id) AS count
  FROM days d
  LEFT JOIN public.profiles p ON date_trunc('day', p.created_at) = d.day
  GROUP BY d.day
  ORDER BY d.day ASC;
END;
$function$;

-- Admin function: Get subscription distribution
CREATE OR REPLACE FUNCTION public.admin_get_subscription_distribution()
RETURNS TABLE(tier text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access Denied: Not a superadmin.';
  END IF;

  RETURN QUERY
  SELECT
    p.subscription_tier::text AS tier,
    count(*) AS count
  FROM public.profiles p
  GROUP BY p.subscription_tier
  ORDER BY count DESC;
END;
$function$;

-- Get recruiter counts by tier category
CREATE OR REPLACE FUNCTION public.get_recruiter_counts_by_tier_category()
RETURNS TABLE(domain_name text, subdomain_id uuid, tier text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(d.name, r.domain, 'Other') as domain_name,
        r.subdomain_id,
        COALESCE(r.tier, 'FREE') as tier,
        COUNT(*) as count
    FROM public.recruiters r
    LEFT JOIN public.subdomains sd ON r.subdomain_id = sd.id
    LEFT JOIN public.domains d ON sd.domain_id = d.id OR r.domain = d.name
    WHERE r.tier IS NOT NULL
    GROUP BY d.name, r.domain, r.subdomain_id, r.tier
    ORDER BY domain_name, subdomain_id, tier;
END;
$function$;

-- Get tier limits
CREATE OR REPLACE FUNCTION public.get_tier_limits()
RETURNS TABLE(tier text, limit_per_category integer)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
    SELECT 'FREE'::TEXT, 5::INTEGER
    UNION ALL
    SELECT 'PRO'::TEXT, 30::INTEGER
    UNION ALL
    SELECT 'PRO_MAX'::TEXT, 60::INTEGER;
$function$;

-- Update session duration trigger function
CREATE OR REPLACE FUNCTION public.update_session_duration()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
    END IF;
    RETURN NEW;
END;
$function$;

-- Update session active status trigger function
CREATE OR REPLACE FUNCTION public.update_session_active_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.is_active = (NEW.last_activity_at > NOW() - INTERVAL '2 minutes') AND (NEW.ended_at IS NULL);
    RETURN NEW;
END;
$function$;

-- Update push campaign stats trigger function
CREATE OR REPLACE FUNCTION public.update_campaign_stats()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.push_notification_campaigns
  SET
    delivered_count = (
      SELECT COUNT(*) FROM public.push_notification_events
      WHERE campaign_id = NEW.campaign_id
      AND event_type = 'delivered'
    ),
    clicked_count = (
      SELECT COUNT(*) FROM public.push_notification_events
      WHERE campaign_id = NEW.campaign_id
      AND event_type = 'clicked'
    )
  WHERE id = NEW.campaign_id;
  
  RETURN NEW;
END;
$function$;

-- Update conversation threads updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_conversation_threads_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- Update follow-up suggestions updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_follow_up_suggestions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- Update notification campaigns updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_notification_campaigns_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- ===========================================
-- PART 4: TRIGGERS
-- ===========================================

-- Trigger to handle new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for session duration update
CREATE TRIGGER update_session_duration_trigger
    BEFORE UPDATE ON public.user_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_session_duration();

-- Trigger for session active status
CREATE TRIGGER update_session_active_trigger
    BEFORE UPDATE ON public.user_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_session_active_status();

-- Trigger for push campaign stats
CREATE TRIGGER update_campaign_stats_trigger
    AFTER INSERT ON public.push_notification_events
    FOR EACH ROW EXECUTE FUNCTION public.update_campaign_stats();

-- ===========================================
-- PART 5: ENABLE ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subdomains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_recruiter_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_credentials ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- PART 6: RLS POLICIES
-- ===========================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Superadmins can manage all profiles" ON public.profiles FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Domains policies
CREATE POLICY "Anyone can view active domains" ON public.domains FOR SELECT USING (is_active = true);
CREATE POLICY "Superadmins can manage domains" ON public.domains FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- Subdomains policies
CREATE POLICY "Anyone can view active subdomains" ON public.subdomains FOR SELECT USING (is_active = true);
CREATE POLICY "Superadmins can manage subdomains" ON public.subdomains FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- Recruiters policies
CREATE POLICY "Authenticated users can view recruiters" ON public.recruiters FOR SELECT USING (true);
CREATE POLICY "Superadmins can manage recruiters" ON public.recruiters FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- Subscription plans policies
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Superadmins can manage plans" ON public.subscription_plans FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- Subscription history policies
CREATE POLICY "Users can view own subscription history" ON public.subscription_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription history" ON public.subscription_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Superadmins can view all subscription history" ON public.subscription_history FOR SELECT USING (is_superadmin());

-- Email history policies
CREATE POLICY "Users can view their own email history" ON public.email_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own email history" ON public.email_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Superadmins can view all email history" ON public.email_history FOR SELECT USING (is_superadmin());

-- Email tracking policies
CREATE POLICY "Users can view their own email tracking data" ON public.email_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own email tracking data" ON public.email_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own email tracking data" ON public.email_tracking FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own email tracking data" ON public.email_tracking FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Superadmins can view all email tracking" ON public.email_tracking FOR SELECT USING (is_superadmin());

-- Email templates policies
CREATE POLICY "Users can view global and their own email templates" ON public.email_templates FOR SELECT USING ((is_global = true) OR (auth.uid() = user_id));
CREATE POLICY "Users can insert their own email templates" ON public.email_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own email templates" ON public.email_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own email templates" ON public.email_templates FOR DELETE USING (auth.uid() = user_id);

-- Conversation threads policies
CREATE POLICY "Users can view own threads" ON public.conversation_threads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own threads" ON public.conversation_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own threads" ON public.conversation_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own threads" ON public.conversation_threads FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Superadmins can view all threads" ON public.conversation_threads FOR SELECT USING (is_superadmin());

-- Conversation messages policies
CREATE POLICY "Users can view own messages" ON public.conversation_messages FOR SELECT USING (EXISTS (SELECT 1 FROM conversation_threads WHERE conversation_threads.id = conversation_messages.thread_id AND conversation_threads.user_id = auth.uid()));
CREATE POLICY "Users can insert own messages" ON public.conversation_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM conversation_threads WHERE conversation_threads.id = conversation_messages.thread_id AND conversation_threads.user_id = auth.uid()));
CREATE POLICY "Users can update own messages" ON public.conversation_messages FOR UPDATE USING (EXISTS (SELECT 1 FROM conversation_threads WHERE conversation_threads.id = conversation_messages.thread_id AND conversation_threads.user_id = auth.uid()));
CREATE POLICY "Superadmins can view all messages" ON public.conversation_messages FOR SELECT USING (is_superadmin());

-- Follow-up suggestions policies
CREATE POLICY "Users can view own follow-ups" ON public.follow_up_suggestions FOR SELECT USING (EXISTS (SELECT 1 FROM conversation_threads WHERE conversation_threads.id = follow_up_suggestions.thread_id AND conversation_threads.user_id = auth.uid()));
CREATE POLICY "Users can insert own follow-ups" ON public.follow_up_suggestions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM conversation_threads WHERE conversation_threads.id = follow_up_suggestions.thread_id AND conversation_threads.user_id = auth.uid()));
CREATE POLICY "Users can update own follow-ups" ON public.follow_up_suggestions FOR UPDATE USING (EXISTS (SELECT 1 FROM conversation_threads WHERE conversation_threads.id = follow_up_suggestions.thread_id AND conversation_threads.user_id = auth.uid()));
CREATE POLICY "Users can delete own follow-ups" ON public.follow_up_suggestions FOR DELETE USING (EXISTS (SELECT 1 FROM conversation_threads WHERE conversation_threads.id = follow_up_suggestions.thread_id AND conversation_threads.user_id = auth.uid()));
CREATE POLICY "Superadmins can view all follow-ups" ON public.follow_up_suggestions FOR SELECT USING (is_superadmin());

-- Job applications policies
CREATE POLICY "Users can view their own job applications" ON public.job_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own job applications" ON public.job_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own job applications" ON public.job_applications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own job applications" ON public.job_applications FOR DELETE USING (auth.uid() = user_id);

-- Domain recruiter requests policies
CREATE POLICY "Users can view own requests" ON public.domain_recruiter_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own requests" ON public.domain_recruiter_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Superadmins can view all requests" ON public.domain_recruiter_requests FOR SELECT USING (is_superadmin());
CREATE POLICY "Superadmins can manage requests" ON public.domain_recruiter_requests FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- Notification campaigns policies
CREATE POLICY "Superadmins can view all campaigns" ON public.notification_campaigns FOR SELECT USING (is_superadmin());
CREATE POLICY "Superadmins can insert campaigns" ON public.notification_campaigns FOR INSERT WITH CHECK (is_superadmin() AND (created_by = auth.uid()));
CREATE POLICY "Superadmins can update campaigns" ON public.notification_campaigns FOR UPDATE USING (is_superadmin());
CREATE POLICY "Superadmins can delete campaigns" ON public.notification_campaigns FOR DELETE USING (is_superadmin());

-- Notification recipients policies
CREATE POLICY "Superadmins can view all recipients" ON public.notification_recipients FOR SELECT USING (is_superadmin());
CREATE POLICY "Superadmins can manage recipients" ON public.notification_recipients FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- User notifications policies
CREATE POLICY "Users can view their own notifications" ON public.user_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.user_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert notifications" ON public.user_notifications FOR INSERT WITH CHECK (is_superadmin());

-- Push notification campaigns policies
CREATE POLICY "Superadmins can view push campaigns" ON public.push_notification_campaigns FOR SELECT USING (is_superadmin());
CREATE POLICY "Superadmins can manage push campaigns" ON public.push_notification_campaigns FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- Push notification events policies
CREATE POLICY "Users can view own push events" ON public.push_notification_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Superadmins can view all push events" ON public.push_notification_events FOR SELECT USING (is_superadmin());
CREATE POLICY "Superadmins can manage push events" ON public.push_notification_events FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- Push subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON public.push_subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subscriptions" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Chatbot conversations policies
CREATE POLICY "Users can view own chatbot conversations" ON public.chatbot_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chatbot conversations" ON public.chatbot_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Superadmins can view all chatbot conversations" ON public.chatbot_conversations FOR SELECT USING (is_superadmin());

-- User sessions policies
CREATE POLICY "Users can view own sessions" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.user_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Superadmins can view all sessions" ON public.user_sessions FOR SELECT USING (is_superadmin());

-- User activity events policies
CREATE POLICY "Users can view own activity events" ON public.user_activity_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity events" ON public.user_activity_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Superadmins can view all activity events" ON public.user_activity_events FOR SELECT USING (is_superadmin());

-- User engagement metrics policies
CREATE POLICY "Users can view own engagement metrics" ON public.user_engagement_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Superadmins can view all engagement metrics" ON public.user_engagement_metrics FOR SELECT USING (is_superadmin());
CREATE POLICY "Superadmins can manage engagement metrics" ON public.user_engagement_metrics FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- Page analytics policies
CREATE POLICY "Superadmins can view page analytics" ON public.page_analytics FOR SELECT USING (is_superadmin());
CREATE POLICY "Superadmins can manage page analytics" ON public.page_analytics FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- User resumes policies
CREATE POLICY "Users can view their own resumes" ON public.user_resumes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own resumes" ON public.user_resumes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own resumes" ON public.user_resumes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own resumes" ON public.user_resumes FOR DELETE USING (auth.uid() = user_id);

-- Scraper config policies
CREATE POLICY "Superadmins can view scraper config" ON public.scraper_config FOR SELECT USING (is_superadmin());
CREATE POLICY "Superadmins can manage scraper config" ON public.scraper_config FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- Scraping logs policies
CREATE POLICY "Superadmins can view scraping logs" ON public.scraping_logs FOR SELECT USING (is_superadmin());
CREATE POLICY "Superadmins can manage scraping logs" ON public.scraping_logs FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- System credentials policies
CREATE POLICY "Superadmins can view system credentials" ON public.system_credentials FOR SELECT USING (is_superadmin());
CREATE POLICY "Superadmins can manage system credentials" ON public.system_credentials FOR ALL USING (is_superadmin()) WITH CHECK (is_superadmin());

-- ===========================================
-- PART 7: STORAGE BUCKETS
-- ===========================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Storage policies for avatars (public)
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for resumes (private)
CREATE POLICY "Users can view their own resumes" ON storage.objects FOR SELECT USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own resumes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own resumes" ON storage.objects FOR UPDATE USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own resumes" ON storage.objects FOR DELETE USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ===========================================
-- END OF MIGRATION
-- ===========================================

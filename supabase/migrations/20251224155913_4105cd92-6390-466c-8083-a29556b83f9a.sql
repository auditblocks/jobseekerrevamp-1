-- =====================================================
-- FEATURE-SPECIFIC TABLES
-- =====================================================

-- =====================================================
-- EMAIL TRACKING TABLE
-- =====================================================
CREATE TABLE public.email_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_id TEXT,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'replied', 'bounced')),
    metadata JSONB DEFAULT '{}',
    domain TEXT,
    click_links JSONB DEFAULT '[]',
    tracking_pixel_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.email_tracking ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_email_tracking_user_id ON public.email_tracking(user_id);
CREATE INDEX idx_email_tracking_sent_at ON public.email_tracking(sent_at);
CREATE INDEX idx_email_tracking_tracking_pixel_id ON public.email_tracking(tracking_pixel_id);
CREATE INDEX idx_email_tracking_recipient ON public.email_tracking(recipient);
CREATE INDEX idx_email_tracking_status ON public.email_tracking(status);

-- =====================================================
-- EMAIL HISTORY TABLE
-- =====================================================
CREATE TABLE public.email_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Delivered', 'Opened', 'Bounced')),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    domain TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_email_history_user_id ON public.email_history(user_id);
CREATE INDEX idx_email_history_sent_at ON public.email_history(sent_at);

-- =====================================================
-- EMAIL TEMPLATES TABLE
-- =====================================================
CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT,
    industry TEXT,
    role TEXT,
    tags TEXT[],
    is_global BOOLEAN DEFAULT FALSE,
    created_by TEXT DEFAULT 'user',
    rating NUMERIC DEFAULT 0,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_email_templates_user_id ON public.email_templates(user_id);
CREATE INDEX idx_email_templates_is_global ON public.email_templates(is_global);
CREATE INDEX idx_email_templates_category ON public.email_templates(category);
CREATE INDEX idx_email_templates_industry ON public.email_templates(industry);

-- =====================================================
-- JOB APPLICATIONS TABLE
-- =====================================================
CREATE TABLE public.job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    job_url TEXT,
    recruiter_email TEXT NOT NULL,
    recruiter_name TEXT,
    application_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'applied' CHECK (status IN (
        'applied', 'viewed', 'interview_scheduled', 'interviewed', 
        'offered', 'rejected', 'withdrawn'
    )),
    source TEXT DEFAULT 'email_outreach' CHECK (source IN (
        'email_outreach', 'job_board', 'referral', 'direct'
    )),
    notes TEXT,
    follow_up_date TIMESTAMPTZ,
    interview_date TIMESTAMPTZ,
    offer_amount NUMERIC,
    response_received BOOLEAN DEFAULT FALSE,
    response_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_job_applications_user_id ON public.job_applications(user_id);
CREATE INDEX idx_job_applications_application_date ON public.job_applications(application_date);
CREATE INDEX idx_job_applications_status ON public.job_applications(status);
CREATE INDEX idx_job_applications_recruiter_email ON public.job_applications(recruiter_email);

-- =====================================================
-- CONVERSATION THREADS TABLE
-- =====================================================
CREATE TABLE public.conversation_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recruiter_email TEXT NOT NULL,
    recruiter_name TEXT,
    company_name TEXT,
    subject_line TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    first_contact_at TIMESTAMPTZ DEFAULT NOW(),
    total_messages INTEGER DEFAULT 0,
    user_messages_count INTEGER DEFAULT 0,
    recruiter_messages_count INTEGER DEFAULT 0,
    last_user_message_at TIMESTAMPTZ,
    last_recruiter_message_at TIMESTAMPTZ,
    response_rate NUMERIC DEFAULT 0,
    engagement_score INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, recruiter_email)
);

ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_conversation_threads_user_id ON public.conversation_threads(user_id);
CREATE INDEX idx_conversation_threads_recruiter_email ON public.conversation_threads(recruiter_email);
CREATE INDEX idx_conversation_threads_status ON public.conversation_threads(status);
CREATE INDEX idx_conversation_threads_last_activity ON public.conversation_threads(last_activity_at DESC);

-- =====================================================
-- CONVERSATION MESSAGES TABLE
-- =====================================================
CREATE TABLE public.conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
    email_history_id UUID REFERENCES public.email_history(id) ON DELETE SET NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'recruiter')),
    subject TEXT NOT NULL,
    body_preview TEXT,
    body_full TEXT,
    sent_at TIMESTAMPTZ NOT NULL,
    opened_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'replied', 'bounced')),
    is_follow_up BOOLEAN DEFAULT FALSE,
    follow_up_to_message_id UUID REFERENCES public.conversation_messages(id),
    message_number INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_conversation_messages_thread_id ON public.conversation_messages(thread_id);
CREATE INDEX idx_conversation_messages_sent_at ON public.conversation_messages(sent_at DESC);
CREATE INDEX idx_conversation_messages_sender_type ON public.conversation_messages(sender_type);
CREATE INDEX idx_conversation_messages_email_history_id ON public.conversation_messages(email_history_id);

-- =====================================================
-- FOLLOW-UP SUGGESTIONS TABLE
-- =====================================================
CREATE TABLE public.follow_up_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
    suggested_at TIMESTAMPTZ DEFAULT NOW(),
    suggested_date TIMESTAMPTZ NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    reason TEXT NOT NULL,
    suggested_subject TEXT,
    suggested_body_preview TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sent', 'dismissed')),
    ai_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.follow_up_suggestions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_follow_up_suggestions_thread_id ON public.follow_up_suggestions(thread_id);
CREATE INDEX idx_follow_up_suggestions_status ON public.follow_up_suggestions(status);
CREATE INDEX idx_follow_up_suggestions_suggested_date ON public.follow_up_suggestions(suggested_date);

-- =====================================================
-- RLS POLICIES FOR FEATURE TABLES
-- =====================================================

-- Email Tracking policies
CREATE POLICY "Users can view their own email tracking data"
ON public.email_tracking FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email tracking data"
ON public.email_tracking FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email tracking data"
ON public.email_tracking FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email tracking data"
ON public.email_tracking FOR DELETE
USING (auth.uid() = user_id);

-- Email History policies
CREATE POLICY "Users can view their own email history"
ON public.email_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email history"
ON public.email_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all email history"
ON public.email_history FOR SELECT
TO authenticated
USING (public.is_superadmin());

-- Email Templates policies
CREATE POLICY "Users can view global and their own email templates"
ON public.email_templates FOR SELECT
USING (is_global = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own email templates"
ON public.email_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email templates"
ON public.email_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email templates"
ON public.email_templates FOR DELETE
USING (auth.uid() = user_id);

-- Job Applications policies
CREATE POLICY "Users can view their own job applications"
ON public.job_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job applications"
ON public.job_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job applications"
ON public.job_applications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job applications"
ON public.job_applications FOR DELETE
USING (auth.uid() = user_id);

-- Conversation Threads policies
CREATE POLICY "Users can view own threads"
ON public.conversation_threads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own threads"
ON public.conversation_threads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads"
ON public.conversation_threads FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own threads"
ON public.conversation_threads FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all threads"
ON public.conversation_threads FOR SELECT
TO authenticated
USING (public.is_superadmin());

-- Conversation Messages policies
CREATE POLICY "Users can view own messages"
ON public.conversation_messages FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.conversation_threads WHERE id = thread_id AND user_id = auth.uid())
);

CREATE POLICY "Users can insert own messages"
ON public.conversation_messages FOR INSERT
WITH CHECK (
    EXISTS (SELECT 1 FROM public.conversation_threads WHERE id = thread_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update own messages"
ON public.conversation_messages FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.conversation_threads WHERE id = thread_id AND user_id = auth.uid())
);

CREATE POLICY "Superadmins can view all messages"
ON public.conversation_messages FOR SELECT
TO authenticated
USING (public.is_superadmin());

-- Follow-up Suggestions policies
CREATE POLICY "Users can view own follow-ups"
ON public.follow_up_suggestions FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.conversation_threads WHERE id = thread_id AND user_id = auth.uid())
);

CREATE POLICY "Users can insert own follow-ups"
ON public.follow_up_suggestions FOR INSERT
WITH CHECK (
    EXISTS (SELECT 1 FROM public.conversation_threads WHERE id = thread_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update own follow-ups"
ON public.follow_up_suggestions FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.conversation_threads WHERE id = thread_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete own follow-ups"
ON public.follow_up_suggestions FOR DELETE
USING (
    EXISTS (SELECT 1 FROM public.conversation_threads WHERE id = thread_id AND user_id = auth.uid())
);

CREATE POLICY "Superadmins can view all follow-ups"
ON public.follow_up_suggestions FOR SELECT
TO authenticated
USING (public.is_superadmin());

-- =====================================================
-- TRIGGERS FOR FEATURE TABLES
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_conversation_threads_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_conversation_threads_timestamp
    BEFORE UPDATE ON public.conversation_threads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conversation_threads_updated_at();

CREATE OR REPLACE FUNCTION public.update_follow_up_suggestions_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_follow_up_suggestions_timestamp
    BEFORE UPDATE ON public.follow_up_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_follow_up_suggestions_updated_at();
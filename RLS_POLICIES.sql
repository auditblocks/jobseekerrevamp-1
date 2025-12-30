-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Complete RLS policy definitions for all tables
-- ============================================

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications"
CREATE POLICY "Users can update their own notifications"
CREATE POLICY "Admins can insert notifications"
CREATE POLICY "Users can view own sessions"
CREATE POLICY "Users can insert own sessions"
CREATE POLICY "Users can update own sessions"
CREATE POLICY "Superadmins can view all sessions"
CREATE POLICY "Users can view own activity events"
CREATE POLICY "Users can insert own activity events"
CREATE POLICY "Superadmins can view all activity events"
CREATE POLICY "Users can view own engagement metrics"
CREATE POLICY "Superadmins can view all engagement metrics"
CREATE POLICY "Superadmins can manage engagement metrics"
CREATE POLICY "Superadmins can view page analytics"
CREATE POLICY "Superadmins can manage page analytics"
CREATE POLICY "Superadmins can view all campaigns"
CREATE POLICY "Superadmins can insert campaigns"
CREATE POLICY "Superadmins can update campaigns"
CREATE POLICY "Superadmins can delete campaigns"
CREATE POLICY "Superadmins can view all recipients"
CREATE POLICY "Superadmins can manage recipients"
CREATE POLICY "Users can view own subscriptions"
CREATE POLICY "Users can insert own subscriptions"
CREATE POLICY "Users can update own subscriptions"
CREATE POLICY "Users can delete own subscriptions"
CREATE POLICY "Superadmins can view push campaigns"
CREATE POLICY "Superadmins can manage push campaigns"
CREATE POLICY "Users can view own push events"
CREATE POLICY "Superadmins can view all push events"
CREATE POLICY "Superadmins can manage push events"
CREATE POLICY "Superadmins can view scraping logs"
CREATE POLICY "Superadmins can manage scraping logs"
CREATE POLICY "Superadmins can view scraper config"
CREATE POLICY "Superadmins can manage scraper config"
CREATE POLICY "Users can view own requests"
CREATE POLICY "Users can insert own requests"
CREATE POLICY "Superadmins can view all requests"
CREATE POLICY "Superadmins can manage requests"
CREATE POLICY "Users can view own chatbot conversations"
CREATE POLICY "Users can insert own chatbot conversations"
CREATE POLICY "Superadmins can view all chatbot conversations"
CREATE POLICY "Superadmins can view system credentials"
CREATE POLICY "Superadmins can manage system credentials"
ALTER TABLE public.email_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own email tracking data"
CREATE POLICY "Users can insert their own email tracking data"
CREATE POLICY "Users can update their own email tracking data"
CREATE POLICY "Users can delete their own email tracking data"
CREATE POLICY "Users can view their own email history"
CREATE POLICY "Users can insert their own email history"
CREATE POLICY "Superadmins can view all email history"
CREATE POLICY "Users can view global and their own email templates"
CREATE POLICY "Users can insert their own email templates"
CREATE POLICY "Users can update their own email templates"
CREATE POLICY "Users can delete their own email templates"
CREATE POLICY "Users can view their own job applications"
CREATE POLICY "Users can insert their own job applications"
CREATE POLICY "Users can update their own job applications"
CREATE POLICY "Users can delete their own job applications"
CREATE POLICY "Users can view own threads"
CREATE POLICY "Users can insert own threads"
CREATE POLICY "Users can update own threads"
CREATE POLICY "Users can delete own threads"
CREATE POLICY "Superadmins can view all threads"
CREATE POLICY "Users can view own messages"
CREATE POLICY "Users can insert own messages"
CREATE POLICY "Users can update own messages"
CREATE POLICY "Superadmins can view all messages"
CREATE POLICY "Users can view own follow-ups"
CREATE POLICY "Users can insert own follow-ups"
CREATE POLICY "Users can update own follow-ups"
CREATE POLICY "Users can delete own follow-ups"
CREATE POLICY "Superadmins can view all follow-ups"
CREATE POLICY "Superadmins can view all email tracking"
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subdomains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles"
CREATE POLICY "Anyone can view active domains"
CREATE POLICY "Superadmins can manage domains"
CREATE POLICY "Anyone can view active subdomains"
CREATE POLICY "Superadmins can manage subdomains"
CREATE POLICY "Users can view own profile"
CREATE POLICY "Users can update own profile"
CREATE POLICY "Users can insert own profile"
CREATE POLICY "Superadmins can manage all profiles"
CREATE POLICY "Anyone can view active plans"
CREATE POLICY "Superadmins can manage plans"
CREATE POLICY "Users can view own subscription history"
CREATE POLICY "Users can insert own subscription history"
CREATE POLICY "Superadmins can view all subscription history"
CREATE POLICY "Authenticated users can view recruiters"
CREATE POLICY "Superadmins can manage recruiters"
ALTER TABLE public.dashboard_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view dashboard config"
CREATE POLICY "Admins can insert dashboard config"
CREATE POLICY "Admins can update dashboard config"
CREATE POLICY "Admins can delete dashboard config"
CREATE POLICY "Public can view active dashboard config"
CREATE POLICY "Avatar images are publicly accessible"
CREATE POLICY "Users can upload their own avatar"
CREATE POLICY "Users can update their own avatar"
CREATE POLICY "Users can delete their own avatar"
CREATE POLICY "Users can view their own resumes"
CREATE POLICY "Users can upload their own resume"
CREATE POLICY "Users can update their own resume"
CREATE POLICY "Users can delete their own resume"
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_recruiter_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own resumes"
CREATE POLICY "Users can insert their own resumes"
CREATE POLICY "Users can update their own resumes"
CREATE POLICY "Users can delete their own resumes"

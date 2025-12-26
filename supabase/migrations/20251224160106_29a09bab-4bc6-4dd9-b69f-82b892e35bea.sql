-- =====================================================
-- RLS POLICIES FOR ANALYTICS AND SYSTEM TABLES
-- =====================================================

-- User Sessions policies
CREATE POLICY "Users can view own sessions"
ON public.user_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
ON public.user_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
ON public.user_sessions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all sessions"
ON public.user_sessions FOR SELECT
TO authenticated
USING (public.is_superadmin());

-- User Activity Events policies
CREATE POLICY "Users can view own activity events"
ON public.user_activity_events FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity events"
ON public.user_activity_events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all activity events"
ON public.user_activity_events FOR SELECT
TO authenticated
USING (public.is_superadmin());

-- User Engagement Metrics policies
CREATE POLICY "Users can view own engagement metrics"
ON public.user_engagement_metrics FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all engagement metrics"
ON public.user_engagement_metrics FOR SELECT
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can manage engagement metrics"
ON public.user_engagement_metrics FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Page Analytics policies (superadmin only)
CREATE POLICY "Superadmins can view page analytics"
ON public.page_analytics FOR SELECT
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can manage page analytics"
ON public.page_analytics FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Notification Campaigns policies
CREATE POLICY "Superadmins can view all campaigns"
ON public.notification_campaigns FOR SELECT
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can insert campaigns"
ON public.notification_campaigns FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin() AND created_by = auth.uid());

CREATE POLICY "Superadmins can update campaigns"
ON public.notification_campaigns FOR UPDATE
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can delete campaigns"
ON public.notification_campaigns FOR DELETE
TO authenticated
USING (public.is_superadmin());

-- Notification Recipients policies
CREATE POLICY "Superadmins can view all recipients"
ON public.notification_recipients FOR SELECT
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can manage recipients"
ON public.notification_recipients FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Push Subscriptions policies
CREATE POLICY "Users can view own subscriptions"
ON public.push_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
ON public.push_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
ON public.push_subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
ON public.push_subscriptions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Push Notification Campaigns policies
CREATE POLICY "Superadmins can view push campaigns"
ON public.push_notification_campaigns FOR SELECT
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can manage push campaigns"
ON public.push_notification_campaigns FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Push Notification Events policies
CREATE POLICY "Users can view own push events"
ON public.push_notification_events FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all push events"
ON public.push_notification_events FOR SELECT
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can manage push events"
ON public.push_notification_events FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Scraping Logs policies (superadmin only)
CREATE POLICY "Superadmins can view scraping logs"
ON public.scraping_logs FOR SELECT
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can manage scraping logs"
ON public.scraping_logs FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Scraper Config policies (superadmin only)
CREATE POLICY "Superadmins can view scraper config"
ON public.scraper_config FOR SELECT
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can manage scraper config"
ON public.scraper_config FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Domain Recruiter Requests policies
CREATE POLICY "Users can view own requests"
ON public.domain_recruiter_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own requests"
ON public.domain_recruiter_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all requests"
ON public.domain_recruiter_requests FOR SELECT
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can manage requests"
ON public.domain_recruiter_requests FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Chatbot Conversations policies
CREATE POLICY "Users can view own chatbot conversations"
ON public.chatbot_conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chatbot conversations"
ON public.chatbot_conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all chatbot conversations"
ON public.chatbot_conversations FOR SELECT
TO authenticated
USING (public.is_superadmin());

-- System Credentials policies (superadmin only)
CREATE POLICY "Superadmins can view system credentials"
ON public.system_credentials FOR SELECT
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmins can manage system credentials"
ON public.system_credentials FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- =====================================================
-- ADDITIONAL TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_notification_campaigns_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_notification_campaigns_timestamp
    BEFORE UPDATE ON public.notification_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notification_campaigns_updated_at();

CREATE OR REPLACE FUNCTION public.update_session_duration()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_session_duration
    BEFORE UPDATE ON public.user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_session_duration();

CREATE OR REPLACE FUNCTION public.update_session_active_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.is_active = (NEW.last_activity_at > NOW() - INTERVAL '2 minutes') AND (NEW.ended_at IS NULL);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_session_active_status
    BEFORE INSERT OR UPDATE ON public.user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_session_active_status();

CREATE OR REPLACE FUNCTION public.update_campaign_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

CREATE TRIGGER trigger_update_campaign_stats
    AFTER INSERT ON public.push_notification_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_campaign_stats();

-- =====================================================
-- ADMIN FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  role text,
  status text,
  subscription_tier text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.admin_get_user_signups_last_30_days()
RETURNS table(signup_date date, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.admin_get_subscription_distribution()
RETURNS table(tier text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_recruiter_counts_by_tier_category()
RETURNS TABLE(
    domain_name TEXT,
    subdomain_id UUID,
    tier TEXT,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
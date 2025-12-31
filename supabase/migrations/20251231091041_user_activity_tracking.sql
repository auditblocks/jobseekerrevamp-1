-- =====================================================
-- USER ACTIVITY TRACKING ENHANCEMENTS
-- =====================================================

-- =====================================================
-- 1. ADD COLUMNS TO user_sessions TABLE
-- =====================================================
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS current_page TEXT,
ADD COLUMN IF NOT EXISTS current_page_title TEXT;

-- =====================================================
-- 2. ENABLE REALTIME ON user_sessions TABLE
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;

-- =====================================================
-- 3. CREATE RPC FUNCTIONS
-- =====================================================

-- Function: get_online_users_count()
-- Returns count of users with active sessions where last_activity_at is within last 5 minutes
CREATE OR REPLACE FUNCTION public.get_online_users_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    online_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT user_id) INTO online_count
    FROM public.user_sessions
    WHERE is_active = true
    AND last_activity_at >= NOW() - INTERVAL '5 minutes';
    
    RETURN COALESCE(online_count, 0);
END;
$$;

-- Function: admin_get_active_sessions()
-- Returns all active sessions with joined user profile data
CREATE OR REPLACE FUNCTION public.admin_get_active_sessions()
RETURNS TABLE (
    session_id UUID,
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    subscription_tier TEXT,
    session_token TEXT,
    started_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    current_page TEXT,
    current_page_title TEXT,
    device_type TEXT,
    browser TEXT,
    ip_address TEXT,
    session_duration_seconds INTEGER,
    is_online BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as session_id,
        s.user_id,
        p.name as user_name,
        p.email as user_email,
        p.subscription_tier,
        s.session_token,
        s.started_at,
        s.last_activity_at,
        s.current_page,
        s.current_page_title,
        s.device_type,
        s.browser,
        s.ip_address,
        EXTRACT(EPOCH FROM (NOW() - s.started_at))::INTEGER as session_duration_seconds,
        (s.last_activity_at >= NOW() - INTERVAL '5 minutes') as is_online
    FROM public.user_sessions s
    LEFT JOIN public.profiles p ON s.user_id = p.id
    WHERE s.is_active = true
    ORDER BY s.last_activity_at DESC;
END;
$$;

-- Function: admin_get_user_activity(user_id, limit)
-- Returns activity events for a specific user
CREATE OR REPLACE FUNCTION public.admin_get_user_activity(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    event_type TEXT,
    page_path TEXT,
    page_title TEXT,
    event_name TEXT,
    element_id TEXT,
    element_type TEXT,
    element_text TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.event_type,
        e.page_path,
        e.page_title,
        e.event_name,
        e.element_id,
        e.element_type,
        e.element_text,
        e.metadata,
        e.created_at
    FROM public.user_activity_events e
    WHERE e.user_id = p_user_id
    ORDER BY e.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Function: admin_get_user_sessions(user_id, limit)
-- Returns session history for a specific user
CREATE OR REPLACE FUNCTION public.admin_get_user_sessions(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    session_token TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    device_type TEXT,
    browser TEXT,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN,
    exit_page TEXT,
    exit_reason TEXT,
    current_page TEXT,
    current_page_title TEXT,
    last_activity_at TIMESTAMPTZ,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.session_token,
        s.started_at,
        s.ended_at,
        s.duration_seconds,
        s.device_type,
        s.browser,
        s.ip_address,
        s.user_agent,
        s.is_active,
        s.exit_page,
        s.exit_reason,
        s.current_page,
        s.current_page_title,
        s.last_activity_at,
        s.metadata
    FROM public.user_sessions s
    WHERE s.user_id = p_user_id
    ORDER BY s.started_at DESC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- 4. GRANT EXECUTE PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION public.get_online_users_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_active_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_activity(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_sessions(UUID, INTEGER) TO authenticated;


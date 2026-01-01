-- =====================================================
-- ADMIN GET ALL SESSIONS FUNCTION
-- =====================================================
-- Function to get all sessions (active + inactive) with optional date range filtering

CREATE OR REPLACE FUNCTION public.admin_get_all_sessions(
    p_include_inactive BOOLEAN DEFAULT false,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
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
    is_online BOOLEAN,
    is_active BOOLEAN,
    ended_at TIMESTAMPTZ
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
        CASE 
            WHEN s.is_active = true THEN EXTRACT(EPOCH FROM (NOW() - s.started_at))::INTEGER
            WHEN s.ended_at IS NOT NULL THEN EXTRACT(EPOCH FROM (s.ended_at - s.started_at))::INTEGER
            ELSE EXTRACT(EPOCH FROM (NOW() - s.started_at))::INTEGER
        END as session_duration_seconds,
        (s.last_activity_at >= NOW() - INTERVAL '5 minutes' AND s.is_active = true) as is_online,
        s.is_active,
        s.ended_at
    FROM public.user_sessions s
    LEFT JOIN public.profiles p ON s.user_id = p.id
    WHERE 
        (p_include_inactive = true OR s.is_active = true)
        AND (p_start_date IS NULL OR s.last_activity_at >= p_start_date)
        AND (p_end_date IS NULL OR s.last_activity_at <= p_end_date)
    ORDER BY s.last_activity_at DESC
    LIMIT 1000;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_get_all_sessions(BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;


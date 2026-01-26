-- Fix the RPC for page view stats to match the actual route paths
CREATE OR REPLACE FUNCTION public.admin_get_page_view_stats()
RETURNS TABLE (
    category TEXT,
    page_path TEXT,
    page_title TEXT,
    total_views BIGINT,
    unique_visitors BIGINT,
    logged_in_views BIGINT,
    guest_views BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'Access Denied: Not a superadmin.';
    END IF;

    RETURN QUERY
    WITH page_views AS (
        SELECT 
            CASE 
                WHEN page_path LIKE '/blog/%' THEN 'Blog'
                -- The previous code used '/govt-jobs/%' but the actual route is '/government-jobs/'
                WHEN page_path LIKE '/government-jobs/%' THEN 'Govt Job'
                ELSE 'Other'
            END as p_category,
            e.page_path,
            e.page_title,
            e.user_id,
            e.session_id
        FROM public.user_activity_events e
        WHERE e.event_type = 'page_view'
        -- Match BOTH patterns just in case, but primary is /government-jobs/
        AND (e.page_path LIKE '/blog/%' OR e.page_path LIKE '/govt-jobs/%' OR e.page_path LIKE '/government-jobs/%')
    )
    SELECT 
        p_category as category,
        pv.page_path,
        MAX(pv.page_title) as page_title,
        COUNT(*) as total_views,
        COUNT(DISTINCT COALESCE(pv.user_id::text, s.guest_id)) as unique_visitors,
        COUNT(*) FILTER (WHERE pv.user_id IS NOT NULL) as logged_in_views,
        COUNT(*) FILTER (WHERE pv.user_id IS NULL) as guest_views
    FROM page_views pv
    LEFT JOIN public.user_sessions s ON pv.session_id = s.id
    GROUP BY p_category, pv.page_path
    ORDER BY total_views DESC;
END;
$$;

-- Ensure explicit permissions for anon to track activity
GRANT SELECT, INSERT, UPDATE ON public.user_sessions TO anon;
GRANT SELECT, INSERT ON public.user_activity_events TO anon;

-- =====================================================
-- GUEST TRACKING SUPPORT
-- =====================================================

-- 1. Make user_id nullable in user_sessions and user_activity_events
ALTER TABLE public.user_sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.user_activity_events ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add guest_id to user_sessions to track anonymous users consistently across tabs
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS guest_id TEXT;

-- 3. Update RLS policies for user_sessions to allow guest (anon) access
DROP POLICY IF EXISTS "Allow anon to insert sessions" ON public.user_sessions;
CREATE POLICY "Allow anon to insert sessions"
ON public.user_sessions FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to update own sessions" ON public.user_sessions;
CREATE POLICY "Allow anon to update own sessions"
ON public.user_sessions FOR UPDATE
TO anon
USING (guest_id IS NOT NULL)
WITH CHECK (guest_id IS NOT NULL);

DROP POLICY IF EXISTS "Allow anon to select own sessions" ON public.user_sessions;
CREATE POLICY "Allow anon to select own sessions"
ON public.user_sessions FOR SELECT
TO anon
USING (guest_id IS NOT NULL);

-- 4. Update RLS policies for user_activity_events to allow guest (anon) access
DROP POLICY IF EXISTS "Allow anon to insert activity events" ON public.user_activity_events;
CREATE POLICY "Allow anon to insert activity events"
ON public.user_activity_events FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to select own activity events" ON public.user_activity_events;
CREATE POLICY "Allow anon to select own activity events"
ON public.user_activity_events FOR SELECT
TO anon
USING (session_id IN (SELECT id FROM public.user_sessions WHERE guest_id IS NOT NULL));

-- 5. Create RPC for consolidated page view stats
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
                WHEN page_path LIKE '/govt-jobs/%' THEN 'Govt Job'
                ELSE 'Other'
            END as p_category,
            e.page_path,
            e.page_title,
            e.user_id,
            e.session_id
        FROM public.user_activity_events e
        WHERE e.event_type = 'page_view'
        AND (e.page_path LIKE '/blog/%' OR e.page_path LIKE '/govt-jobs/%')
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

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_get_page_view_stats() TO authenticated;

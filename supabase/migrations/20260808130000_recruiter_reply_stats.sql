-- Recruiter reply score: aggregate real reply behavior from conversation_threads
-- across ALL users who have emailed a given recruiter. This is derived signal a
-- generic job board can't show — it comes from this platform's own outreach data.
--
-- conversation_threads already tracks, per (user, recruiter_email) pair:
--   user_messages_count      - outreach messages the user sent
--   recruiter_messages_count - replies the recruiter sent back
-- reply_rate here is sum(recruiter_messages_count) / sum(user_messages_count)
-- across every user who has contacted that recruiter — a platform-wide rate,
-- not any single user's experience.
--
-- Must be SECURITY DEFINER: conversation_threads RLS is owner-scoped (a user can
-- only see their own threads), but this stat is inherently cross-user. The
-- function only ever returns aggregate numbers — no row-level thread/user data.

CREATE OR REPLACE FUNCTION public.get_recruiter_reply_stats_batch(p_emails text[])
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH emails AS (
    SELECT DISTINCT lower(btrim(e)) AS recruiter_email
    FROM unnest(coalesce(p_emails, '{}')) AS e
    WHERE btrim(e) <> ''
  ),
  agg AS (
    SELECT
      lower(ct.recruiter_email) AS recruiter_email,
      count(*)::int AS sample_size,
      sum(ct.user_messages_count)::int AS total_sent,
      sum(ct.recruiter_messages_count)::int AS total_replied
    FROM public.conversation_threads ct
    JOIN emails em ON em.recruiter_email = lower(ct.recruiter_email)
    GROUP BY lower(ct.recruiter_email)
  )
  SELECT coalesce(
    jsonb_object_agg(
      a.recruiter_email,
      jsonb_build_object(
        'sample_size', a.sample_size,
        'reply_rate',
          CASE WHEN coalesce(a.total_sent, 0) > 0
            THEN round(100.0 * a.total_replied / a.total_sent)::int
            ELSE NULL
          END
      )
    ),
    '{}'::jsonb
  )
  -- Require at least 3 distinct outreach threads before surfacing a badge, so a
  -- single interaction can't make or break a recruiter's public reply score.
  FROM agg a
  WHERE a.sample_size >= 3;
$$;

REVOKE ALL ON FUNCTION public.get_recruiter_reply_stats_batch(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recruiter_reply_stats_batch(text[]) TO authenticated;

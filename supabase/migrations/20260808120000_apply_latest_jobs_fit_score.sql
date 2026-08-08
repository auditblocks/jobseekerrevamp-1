-- Job fit score: rank private jobs by overlap with the caller's resume keywords.
--
-- Free, keyword-overlap scoring only — no AI call per job. Reuses the
-- `matched_keywords` array already produced by the existing ATS analysis
-- pipeline (resume_analyses.matched_keywords) as the resume's "skill vocabulary"
-- and checks how much of it appears in each job's title/summary/skills text.
--
-- Shipped as a new function (`_v2`) rather than editing
-- `get_apply_latest_jobs_page` in place, so existing callers of the original
-- signature are unaffected.

CREATE OR REPLACE FUNCTION public.get_apply_latest_jobs_page_v2(
  p_search text DEFAULT '',
  p_source text DEFAULT 'all',
  p_location text DEFAULT 'all',
  p_salary text DEFAULT 'all',
  p_recency text DEFAULT 'all',
  p_experience text DEFAULT 'all',
  p_remote_only boolean DEFAULT false,
  p_sort text DEFAULT 'scraped_desc',
  p_limit int DEFAULT 12,
  p_offset int DEFAULT 0,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      lower(coalesce(nullif(trim(COALESCE(p_search, '')), ''), '')) AS v_search,
      coalesce(nullif(trim(COALESCE(p_source, '')), ''), 'all') AS v_source,
      coalesce(nullif(trim(COALESCE(p_location, '')), ''), 'all') AS v_location,
      coalesce(nullif(trim(COALESCE(p_salary, '')), ''), 'all') AS v_salary,
      coalesce(nullif(trim(COALESCE(p_recency, '')), ''), 'all') AS v_recency,
      coalesce(nullif(trim(COALESCE(p_experience, '')), ''), 'all') AS v_exp,
      coalesce(nullif(trim(COALESCE(p_sort, '')), ''), 'scraped_desc') AS v_sort,
      LEAST(greatest(coalesce(p_limit, 12), 1), 100) AS v_limit,
      greatest(coalesce(p_offset, 0), 0) AS v_offset,
      (timezone('Asia/Kolkata', now()))::date AS v_today_ist
  ),
  -- Resume keyword vocabulary: matched_keywords from the most recent analysis
  -- of the caller's active resume. Empty when the user has no resume, no
  -- analysis, or p_user_id is NULL (guest / fit score not requested).
  resume_kw AS (
    SELECT array(
      SELECT DISTINCT lower(btrim(kw))
      FROM public.resume_analyses ra
      JOIN public.resumes r ON r.id = ra.resume_id
      CROSS JOIN LATERAL unnest(coalesce(ra.matched_keywords, '{}')) AS kw
      WHERE p_user_id IS NOT NULL
        AND r.user_id = p_user_id
        AND r.is_active = true
        AND btrim(kw) <> ''
      ORDER BY 1
    ) AS kw
  ),
  base AS (
    SELECT
      j.id,
      j.title,
      j.company_name,
      j.location,
      j.apply_url,
      j.posted_at,
      j.summary,
      j.salary_text,
      j.experience_text,
      j.scraped_at,
      j.skills,
      j.source,
      lower(
        coalesce(j.title, '') || ' ' || coalesce(j.summary, '') || ' ' ||
        CASE WHEN j.skills IS NULL OR jsonb_typeof(j.skills) <> 'array' THEN '' ELSE j.skills::text END
      ) AS match_text
    FROM public.naukri_jobs j
    CROSS JOIN params pr
    WHERE j.is_active = true
      AND (pr.v_source = 'all' OR j.source = pr.v_source)
      AND (
        pr.v_location = 'all'
        OR btrim(coalesce(j.location, '')) = pr.v_location
      )
      AND (
        pr.v_salary = 'all'
        OR (
          pr.v_salary = 'listed'
          AND coalesce(btrim(j.salary_text), '') <> ''
        )
        OR (
          pr.v_salary = 'unlisted'
          AND coalesce(btrim(j.salary_text), '') = ''
        )
      )
      AND (
        pr.v_recency = 'all'
        OR coalesce(j.posted_at, j.scraped_at) IS NULL
        OR (
          pr.v_recency = 'week'
          AND coalesce(j.posted_at, j.scraped_at)
            >= (timezone('Asia/Kolkata', now()) - interval '7 days')
        )
        OR (
          pr.v_recency = 'month'
          AND coalesce(j.posted_at, j.scraped_at)
            >= (timezone('Asia/Kolkata', now()) - interval '30 days')
        )
      )
      AND (
        pr.v_exp = 'all'
        OR public.naukri_jobs_experience_bucket(j.experience_text) = pr.v_exp
      )
      AND (
        NOT p_remote_only
        OR j.summary ~* '(remote|wfh|work from home|hybrid|work-from-home)'
        OR j.title ~* '(remote|wfh|work from home|hybrid|work-from-home)'
        OR j.location ~* '(remote|wfh|work from home|hybrid|work-from-home)'
      )
      AND (
        pr.v_search = ''
        OR position(
          pr.v_search IN lower(
            coalesce(j.title, '')
            || ' '
            || coalesce(j.company_name, '')
            || ' '
            || coalesce(j.location, '')
            || ' '
            || coalesce(j.summary, '')
            || ' '
            || coalesce(j.salary_text, '')
            || ' '
            || coalesce(j.experience_text, '')
            || ' '
            || CASE
              WHEN j.skills IS NULL OR jsonb_typeof(j.skills) <> 'array' THEN ''
              ELSE lower(j.skills::text)
            END
          )
        ) > 0
      )
  ),
  scored AS (
    SELECT
      b.*,
      CASE
        WHEN (SELECT coalesce(array_length(kw, 1), 0) FROM resume_kw) = 0 THEN NULL
        ELSE round(
          100.0 *
          (
            SELECT count(*)
            FROM unnest((SELECT kw FROM resume_kw)) AS rk
            WHERE position(rk IN b.match_text) > 0
          )::numeric
          / (SELECT array_length(kw, 1) FROM resume_kw)
        )::int
      END AS fit_score
    FROM base b
  ),
  counted AS (
    SELECT count(*)::bigint AS total FROM scored
  ),
  ordered AS (
    SELECT
      s.*,
      row_number() OVER (
        ORDER BY
          CASE WHEN pr.v_sort = 'title_asc' THEN s.title END ASC NULLS LAST,
          CASE WHEN pr.v_sort = 'posted_desc' THEN s.posted_at END DESC NULLS LAST,
          CASE WHEN pr.v_sort = 'posted_desc' THEN s.scraped_at END DESC NULLS LAST,
          CASE WHEN pr.v_sort = 'fit_desc' THEN s.fit_score END DESC NULLS LAST,
          CASE WHEN pr.v_sort = 'fit_desc' THEN s.scraped_at END DESC NULLS LAST,
          CASE
            WHEN pr.v_sort NOT IN ('title_asc', 'posted_desc', 'fit_desc') THEN s.scraped_at
          END DESC NULLS LAST,
          CASE
            WHEN pr.v_sort NOT IN ('title_asc', 'posted_desc', 'fit_desc') THEN s.posted_at
          END DESC NULLS LAST,
          s.id ASC
      ) AS rn
    FROM scored s
    CROSS JOIN params pr
  ),
  paged AS (
    SELECT o.*
    FROM ordered o
    CROSS JOIN params pr
    WHERE o.rn > pr.v_offset
      AND o.rn <= pr.v_offset + pr.v_limit
  ),
  page_items AS (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'title', p.title,
          'company_name', p.company_name,
          'location', p.location,
          'apply_url', p.apply_url,
          'posted_at', p.posted_at,
          'summary', p.summary,
          'salary_text', p.salary_text,
          'experience_text', p.experience_text,
          'scraped_at', p.scraped_at,
          'skills', p.skills,
          'source', p.source,
          'fit_score', p.fit_score
        )
        ORDER BY p.rn
      ),
      '[]'::jsonb
    ) AS items
    FROM paged p
  ),
  today_rows AS (
    SELECT
      t.title,
      t.company_name,
      t.apply_url,
      row_number() OVER (
        ORDER BY coalesce(t.posted_at, t.scraped_at) DESC NULLS LAST
      ) AS trn
    FROM scored t
    CROSS JOIN params pr
    WHERE (timezone('Asia/Kolkata', coalesce(t.posted_at, t.scraped_at)))::date = pr.v_today_ist
    LIMIT 40
  )
  SELECT jsonb_build_object(
    'total',
    (SELECT total FROM counted LIMIT 1),
    'items',
    (SELECT items FROM page_items),
    'has_fit_scores',
    (SELECT coalesce(array_length(kw, 1), 0) > 0 FROM resume_kw),
    'posted_today_count',
    (
      SELECT count(*)::int
      FROM scored t
      CROSS JOIN params pr
      WHERE (timezone('Asia/Kolkata', coalesce(t.posted_at, t.scraped_at)))::date = pr.v_today_ist
    ),
    'posted_today_sample',
    coalesce(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'title', tr.title,
          'company_name', tr.company_name,
          'apply_url', tr.apply_url
        )
        ORDER BY tr.trn
      )
      FROM today_rows tr),
      '[]'::jsonb
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_apply_latest_jobs_page_v2(
  text, text, text, text, text, text, boolean, text, int, int, uuid
) TO anon, authenticated;

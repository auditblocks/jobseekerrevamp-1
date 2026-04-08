-- Fast Apply Latest Jobs: server-side filters + pagination + chat snapshot metadata.

CREATE OR REPLACE FUNCTION public.naukri_jobs_experience_bucket(experience_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN experience_text IS NULL OR btrim(experience_text) = '' THEN 'unknown'
    WHEN experience_text ~* 'fresher|intern|graduate|entry|trainee|student' THEN 'entry'
    ELSE (
      WITH m AS (
        SELECT
          regexp_match(
            lower(coalesce(experience_text, '')),
            '(\d+)\s*[-–]\s*(\d+)'
          ) AS seg,
          regexp_match(
            lower(coalesce(experience_text, '')),
            '(\d+)\s*\+'
          ) AS plus,
          regexp_match(
            lower(coalesce(experience_text, '')),
            '(\d+)\s*(?:yr|yrs|year|years)\b'
          ) AS y
      )
      SELECT CASE
        WHEN (SELECT seg[1] FROM m) IS NOT NULL THEN
          CASE
            WHEN (SELECT seg[1]::int FROM m) < 2 THEN 'entry'
            WHEN (SELECT seg[1]::int FROM m) < 5 THEN 'mid'
            WHEN (SELECT seg[1]::int FROM m) < 10 THEN 'senior'
            ELSE 'lead'
          END
        WHEN (SELECT plus[1] FROM m) IS NOT NULL THEN
          CASE
            WHEN (SELECT plus[1]::int FROM m) < 2 THEN 'entry'
            WHEN (SELECT plus[1]::int FROM m) < 5 THEN 'mid'
            WHEN (SELECT plus[1]::int FROM m) < 10 THEN 'senior'
            ELSE 'lead'
          END
        WHEN (SELECT y[1] FROM m) IS NOT NULL THEN
          CASE
            WHEN (SELECT y[1]::int FROM m) < 2 THEN 'entry'
            WHEN (SELECT y[1]::int FROM m) < 5 THEN 'mid'
            WHEN (SELECT y[1]::int FROM m) < 10 THEN 'senior'
            ELSE 'lead'
          END
        ELSE 'unknown'
      END
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_apply_latest_jobs_page(
  p_search text DEFAULT '',
  p_source text DEFAULT 'all',
  p_location text DEFAULT 'all',
  p_salary text DEFAULT 'all',
  p_recency text DEFAULT 'all',
  p_experience text DEFAULT 'all',
  p_remote_only boolean DEFAULT false,
  p_sort text DEFAULT 'scraped_desc',
  p_limit int DEFAULT 12,
  p_offset int DEFAULT 0
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
      j.source
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
  counted AS (
    SELECT count(*)::bigint AS total FROM base
  ),
  ordered AS (
    SELECT
      b.id,
      b.title,
      b.company_name,
      b.location,
      b.apply_url,
      b.posted_at,
      b.summary,
      b.salary_text,
      b.experience_text,
      b.scraped_at,
      b.skills,
      b.source,
      row_number() OVER (
        ORDER BY
          CASE WHEN pr.v_sort = 'title_asc' THEN b.title END ASC NULLS LAST,
          CASE WHEN pr.v_sort = 'posted_desc' THEN b.posted_at END DESC NULLS LAST,
          CASE WHEN pr.v_sort = 'posted_desc' THEN b.scraped_at END DESC NULLS LAST,
          CASE
            WHEN pr.v_sort NOT IN ('title_asc', 'posted_desc') THEN b.scraped_at
          END DESC NULLS LAST,
          CASE
            WHEN pr.v_sort NOT IN ('title_asc', 'posted_desc') THEN b.posted_at
          END DESC NULLS LAST,
          b.id ASC
      ) AS rn
    FROM base b
    CROSS JOIN params pr
  ),
  paged AS (
    SELECT
      o.id,
      o.title,
      o.company_name,
      o.location,
      o.apply_url,
      o.posted_at,
      o.summary,
      o.salary_text,
      o.experience_text,
      o.scraped_at,
      o.skills,
      o.source,
      o.rn
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
          'source', p.source
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
    FROM base t
    CROSS JOIN params pr
    WHERE (timezone('Asia/Kolkata', coalesce(t.posted_at, t.scraped_at)))::date = pr.v_today_ist
    LIMIT 40
  )
  SELECT jsonb_build_object(
    'total',
    (SELECT total FROM counted LIMIT 1),
    'items',
    (SELECT items FROM page_items),
    'posted_today_count',
    (
      SELECT count(*)::int
      FROM base t
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

CREATE OR REPLACE FUNCTION public.get_naukri_jobs_location_facets()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT jsonb_agg(s.loc ORDER BY s.cnt DESC)
     FROM (
       SELECT btrim(j.location) AS loc, count(*)::int AS cnt
       FROM public.naukri_jobs j
       WHERE j.is_active = true
         AND j.location IS NOT NULL
         AND btrim(j.location) <> ''
       GROUP BY btrim(j.location)
       ORDER BY cnt DESC
       LIMIT 40
     ) s),
    '[]'::jsonb
  );
$$;

CREATE INDEX IF NOT EXISTS idx_naukri_jobs_active_source_scraped
  ON public.naukri_jobs (is_active, source, scraped_at DESC);

GRANT EXECUTE ON FUNCTION public.naukri_jobs_experience_bucket(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_apply_latest_jobs_page(
  text, text, text, text, text, text, boolean, text, int, int
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_naukri_jobs_location_facets() TO anon, authenticated;

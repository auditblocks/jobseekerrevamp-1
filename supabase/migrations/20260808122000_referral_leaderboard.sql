-- Referral leaderboard: public ranking by qualified referral count, with an
-- opt-out flag so users can hide themselves. Counts come from the existing
-- referral_events table (one 'qualified_payment' row per referee who converted),
-- not from bonus grants, since a referral still "counts" for ranking even after
-- its time-boxed bonus has expired.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_on_referral_leaderboard BOOLEAN NOT NULL DEFAULT true;

-- Masks a display name to "First L." so the public leaderboard never exposes a
-- full name. Falls back to "Member" when the name is empty/unparseable.
-- plpgsql (not sql) because subscripting a regexp_split_to_array() result
-- requires assigning it to a variable first — Postgres doesn't allow
-- subscripting a bare function-call expression in a plain SQL expression.
CREATE OR REPLACE FUNCTION public.mask_leaderboard_name(full_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts text[];
BEGIN
  IF full_name IS NULL OR btrim(full_name) = '' THEN
    RETURN 'Member';
  END IF;

  parts := regexp_split_to_array(btrim(full_name), '\s+');

  IF array_length(parts, 1) > 1 THEN
    RETURN parts[1] || ' ' || upper(left(parts[array_length(parts, 1)], 1)) || '.';
  END IF;

  RETURN parts[1];
END;
$$;

CREATE OR REPLACE FUNCTION public.get_referral_leaderboard(p_limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH counts AS (
    SELECT
      re.referrer_user_id,
      count(*)::int AS referral_count
    FROM public.referral_events re
    WHERE re.event_type = 'qualified_payment'
    GROUP BY re.referrer_user_id
  ),
  ranked AS (
    SELECT
      c.referrer_user_id,
      c.referral_count,
      p.name,
      row_number() OVER (ORDER BY c.referral_count DESC, c.referrer_user_id ASC) AS rn
    FROM counts c
    JOIN public.profiles p ON p.id = c.referrer_user_id
    WHERE p.show_on_referral_leaderboard = true
      AND p.status = 'active'
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rank', r.rn,
        'display_name', public.mask_leaderboard_name(r.name),
        'referral_count', r.referral_count,
        'is_you', r.referrer_user_id = auth.uid()
      )
      ORDER BY r.rn
    ),
    '[]'::jsonb
  )
  FROM ranked r
  WHERE r.rn <= LEAST(greatest(coalesce(p_limit, 20), 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.mask_leaderboard_name(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_leaderboard(int) TO authenticated;

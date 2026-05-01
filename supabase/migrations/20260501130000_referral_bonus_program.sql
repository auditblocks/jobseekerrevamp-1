-- =====================================================
-- REFERRAL BONUS PROGRAM
-- Referrer earns time-boxed bonus when referee completes first paid subscription.
-- Config via dashboard_config; grants in referral_bonus_grants; queue activation via RPC.
-- =====================================================

-- 1. Tables
CREATE TABLE IF NOT EXISTS public.referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_links_referrer_unique
  ON public.referral_links (referrer_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_links_code_ci
  ON public.referral_links (lower(code));

CREATE TABLE IF NOT EXISTS public.referral_attributions (
  referee_user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  referral_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_referrer
  ON public.referral_attributions (referrer_user_id);

CREATE TABLE IF NOT EXISTS public.referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referee_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'qualified_payment',
  subscription_history_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_events_type_check CHECK (event_type IN ('qualified_payment')),
  CONSTRAINT referral_events_referee_event_unique UNIQUE (referee_user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_referral_events_referrer
  ON public.referral_events (referrer_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.referral_bonus_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  referee_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  referrers_tier_at_grant text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  starts_at timestamptz,
  expires_at timestamptz,
  config_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_bonus_grants_status_check CHECK (
    status IN ('queued', 'active', 'expired', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_referral_bonus_grants_referrer_status
  ON public.referral_bonus_grants (referrer_user_id, status, expires_at);

-- 2. Seed dashboard_config
INSERT INTO public.dashboard_config (config_key, config_value, display_order, is_active)
VALUES
  ('referral_program_enabled', '{"enabled": false}'::jsonb, 200, true),
  ('referral_bonus_duration_days', '{"days": 7}'::jsonb, 201, true),
  ('referral_bonus_free', '{"email_per_day": 3, "private_apply_per_day": 3, "govt_tracker_extra": 3}'::jsonb, 202, true),
  ('referral_bonus_pro', '{"email_per_day": 10, "private_apply_per_day": 10, "govt_tracker_extra": 10}'::jsonb, 203, true),
  ('referral_bonus_pro_max', '{"email_per_day": 10, "private_apply_per_day": 10, "govt_tracker_extra": 10}'::jsonb, 204, true),
  ('referral_queue_max', '{"max": 10}'::jsonb, 205, true)
ON CONFLICT (config_key) DO NOTHING;

-- 3. Helpers
CREATE OR REPLACE FUNCTION public.referral_program_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (config_value->>'enabled')::boolean
      FROM public.dashboard_config
      WHERE config_key = 'referral_program_enabled'
        AND is_active = true
      LIMIT 1
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.referral_bonus_duration_days()
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    1,
    COALESCE(
      (
        SELECT (config_value->>'days')::int
        FROM public.dashboard_config
        WHERE config_key = 'referral_bonus_duration_days'
          AND is_active = true
        LIMIT 1
      ),
      7
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.referral_pack_json_for_tier(p_tier text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_pack jsonb;
  v_days int;
BEGIN
  v_days := public.referral_bonus_duration_days();
  v_key := CASE upper(trim(COALESCE(p_tier, 'FREE')))
    WHEN 'PRO_MAX' THEN 'referral_bonus_pro_max'
    WHEN 'PRO' THEN 'referral_bonus_pro'
    ELSE 'referral_bonus_free'
  END;

  SELECT COALESCE(config_value, '{}'::jsonb)
  INTO v_pack
  FROM public.dashboard_config
  WHERE config_key = v_key
    AND is_active = true
  LIMIT 1;

  RETURN COALESCE(v_pack, '{}'::jsonb) || jsonb_build_object('duration_days', v_days);
END;
$$;

CREATE OR REPLACE FUNCTION public.referral_active_bonus_caps(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snap jsonb;
BEGIN
  IF NOT public.referral_program_enabled() THEN
    RETURN '{"email_per_day":0,"private_apply_per_day":0,"govt_tracker_extra":0}'::jsonb;
  END IF;

  SELECT g.config_snapshot
  INTO snap
  FROM public.referral_bonus_grants g
  WHERE g.referrer_user_id = p_user_id
    AND g.status = 'active'
    AND g.starts_at IS NOT NULL
    AND g.expires_at IS NOT NULL
    AND g.starts_at <= now()
    AND g.expires_at > now()
  ORDER BY g.starts_at DESC
  LIMIT 1;

  IF snap IS NULL THEN
    RETURN '{"email_per_day":0,"private_apply_per_day":0,"govt_tracker_extra":0}'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'email_per_day', COALESCE((snap->>'email_per_day')::int, 0),
    'private_apply_per_day', COALESCE((snap->>'private_apply_per_day')::int, 0),
    'govt_tracker_extra', COALESCE((snap->>'govt_tracker_extra')::int, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.effective_email_daily_cap(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_base int;
  v_bonus int;
  v_plan_limit int;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    IF NOT public.is_superadmin() THEN
      RAISE EXCEPTION 'not allowed';
    END IF;
  END IF;

  SELECT subscription_tier INTO v_tier
  FROM public.profiles
  WHERE id = p_user_id;

  v_tier := COALESCE(trim(v_tier), 'FREE');

  SELECT daily_limit INTO v_plan_limit
  FROM public.subscription_plans
  WHERE id = v_tier
  LIMIT 1;

  IF v_plan_limit IS NULL THEN
    v_plan_limit := CASE
      WHEN upper(v_tier) LIKE '%PRO_MAX%' OR upper(replace(v_tier, '-', '_')) LIKE '%PRO_MAX%' THEN 1000
      WHEN upper(v_tier) LIKE '%PRO%' THEN 50
      ELSE 5
    END;
  END IF;

  v_base := COALESCE(v_plan_limit, 5);
  v_bonus := COALESCE((public.referral_active_bonus_caps(p_user_id)->>'email_per_day')::int, 0);

  RETURN jsonb_build_object(
    'base', v_base,
    'bonus', v_bonus,
    'total', v_base + v_bonus
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.referral_on_referee_payment_success(
  p_referee_id uuid,
  p_subscription_history_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer uuid;
  v_tier text;
  v_snap jsonb;
  v_event_id uuid;
  v_active_exists boolean;
  v_queue_count int;
  v_queue_max int;
  v_days int;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_referee_id THEN
    IF NOT public.is_superadmin() THEN
      RAISE EXCEPTION 'not allowed';
    END IF;
  END IF;

  IF NOT public.referral_program_enabled() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'disabled');
  END IF;

  SELECT referrer_user_id INTO v_referrer
  FROM public.referral_attributions
  WHERE referee_user_id = p_referee_id
  LIMIT 1;

  IF v_referrer IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_attribution');
  END IF;

  INSERT INTO public.referral_events (
    referee_user_id,
    referrer_user_id,
    event_type,
    subscription_history_id
  )
  VALUES (p_referee_id, v_referrer, 'qualified_payment', p_subscription_history_id)
  ON CONFLICT (referee_user_id, event_type) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_rewarded');
  END IF;

  SELECT subscription_tier INTO v_tier
  FROM public.profiles
  WHERE id = v_referrer;

  v_snap := public.referral_pack_json_for_tier(COALESCE(v_tier, 'FREE'));
  v_days := GREATEST(1, COALESCE((v_snap->>'duration_days')::int, public.referral_bonus_duration_days()));

  SELECT EXISTS (
    SELECT 1
    FROM public.referral_bonus_grants g
    WHERE g.referrer_user_id = v_referrer
      AND g.status = 'active'
      AND g.starts_at IS NOT NULL
      AND g.expires_at IS NOT NULL
      AND g.starts_at <= now()
      AND g.expires_at > now()
  ) INTO v_active_exists;

  SELECT COALESCE((config_value->>'max')::int, 10)
  INTO v_queue_max
  FROM public.dashboard_config
  WHERE config_key = 'referral_queue_max'
    AND is_active = true
  LIMIT 1;

  IF v_active_exists THEN
    SELECT count(*)::int INTO v_queue_count
    FROM public.referral_bonus_grants
    WHERE referrer_user_id = v_referrer
      AND status = 'queued';

    IF v_queue_count < v_queue_max THEN
      INSERT INTO public.referral_bonus_grants (
        referrer_user_id,
        referee_user_id,
        referrers_tier_at_grant,
        status,
        starts_at,
        expires_at,
        config_snapshot
      )
      VALUES (
        v_referrer,
        p_referee_id,
        COALESCE(v_tier, 'FREE'),
        'queued',
        NULL,
        NULL,
        v_snap
      );
      RETURN jsonb_build_object('ok', true, 'grant', 'queued');
    END IF;

    RETURN jsonb_build_object('ok', false, 'reason', 'queue_full');
  END IF;

  INSERT INTO public.referral_bonus_grants (
    referrer_user_id,
    referee_user_id,
    referrers_tier_at_grant,
    status,
    starts_at,
    expires_at,
    config_snapshot
  )
  VALUES (
    v_referrer,
    p_referee_id,
    COALESCE(v_tier, 'FREE'),
    'active',
    now(),
    now() + (v_days::text || ' days')::interval,
    v_snap
  );

  RETURN jsonb_build_object('ok', true, 'grant', 'active');
END;
$$;

CREATE OR REPLACE FUNCTION public.referral_activate_queued_grants()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int := 0;
  v_days int;
  r record;
BEGIN
  IF NOT public.referral_program_enabled() THEN
    RETURN 0;
  END IF;

  UPDATE public.referral_bonus_grants g
  SET status = 'expired'
  WHERE g.status = 'active'
    AND g.expires_at IS NOT NULL
    AND g.expires_at <= now();

  FOR r IN
    WITH next_grant AS (
      SELECT DISTINCT ON (g.referrer_user_id)
        g.id,
        g.referrer_user_id,
        g.config_snapshot
      FROM public.referral_bonus_grants g
      WHERE g.status = 'queued'
        AND NOT EXISTS (
          SELECT 1
          FROM public.referral_bonus_grants a
          WHERE a.referrer_user_id = g.referrer_user_id
            AND a.status = 'active'
            AND a.starts_at IS NOT NULL
            AND a.expires_at IS NOT NULL
            AND a.starts_at <= now()
            AND a.expires_at > now()
        )
      ORDER BY g.referrer_user_id, g.created_at ASC
    )
    SELECT * FROM next_grant
  LOOP
    v_days := GREATEST(
      1,
      COALESCE((r.config_snapshot->>'duration_days')::int, public.referral_bonus_duration_days())
    );
    UPDATE public.referral_bonus_grants
    SET
      status = 'active',
      starts_at = now(),
      expires_at = now() + (v_days::text || ' days')::interval
    WHERE id = r.id;
    v_updated := v_updated + 1;
  END LOOP;

  RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.referral_ensure_my_link()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_existing text;
  i int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT code INTO v_existing
  FROM public.referral_links
  WHERE referrer_user_id = v_uid
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('code', v_existing);
  END IF;

  LOOP
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text || i::text) from 1 for 8));
    BEGIN
      INSERT INTO public.referral_links (referrer_user_id, code)
      VALUES (v_uid, v_code);
      RETURN jsonb_build_object('code', v_code);
    EXCEPTION
      WHEN unique_violation THEN
        i := i + 1;
        IF i > 50 THEN
          RAISE EXCEPTION 'could not allocate referral code';
        END IF;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.referral_claim_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_norm text := upper(trim(COALESCE(p_code, '')));
  v_link public.referral_links%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF length(v_norm) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  IF EXISTS (SELECT 1 FROM public.referral_attributions WHERE referee_user_id = v_uid) THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'already_attributed');
  END IF;

  SELECT * INTO v_link
  FROM public.referral_links
  WHERE lower(code) = lower(v_norm)
  LIMIT 1;

  IF NOT FOUND OR v_link.referrer_user_id = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  INSERT INTO public.referral_attributions (referee_user_id, referrer_user_id, referral_code)
  VALUES (v_uid, v_link.referrer_user_id, v_link.code);

  RETURN jsonb_build_object('ok', true, 'reason', 'claimed');
END;
$$;

CREATE OR REPLACE FUNCTION public.referral_my_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_active jsonb;
  v_queued int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT code INTO v_code
  FROM public.referral_links
  WHERE referrer_user_id = v_uid
  LIMIT 1;

  SELECT jsonb_build_object(
    'id', g.id,
    'expires_at', g.expires_at,
    'starts_at', g.starts_at,
    'snapshot', g.config_snapshot,
    'referrers_tier_at_grant', g.referrers_tier_at_grant
  )
  INTO v_active
  FROM public.referral_bonus_grants g
  WHERE g.referrer_user_id = v_uid
    AND g.status = 'active'
    AND g.starts_at IS NOT NULL
    AND g.expires_at IS NOT NULL
    AND g.starts_at <= now()
    AND g.expires_at > now()
  ORDER BY g.starts_at DESC
  LIMIT 1;

  SELECT count(*)::int INTO v_queued
  FROM public.referral_bonus_grants
  WHERE referrer_user_id = v_uid
    AND status = 'queued';

  RETURN jsonb_build_object(
    'code', v_code,
    'active_grant', v_active,
    'queued_count', COALESCE(v_queued, 0)
  );
END;
$$;

-- 4. RLS
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_bonus_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY referral_links_select_own
  ON public.referral_links FOR SELECT TO authenticated
  USING (referrer_user_id = auth.uid());

CREATE POLICY referral_attributions_select_own
  ON public.referral_attributions FOR SELECT TO authenticated
  USING (referee_user_id = auth.uid() OR referrer_user_id = auth.uid());

CREATE POLICY referral_bonus_grants_select_own
  ON public.referral_bonus_grants FOR SELECT TO authenticated
  USING (referrer_user_id = auth.uid());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') THEN
    EXECUTE $p$
      CREATE POLICY referral_links_superadmin_all
      ON public.referral_links FOR ALL TO authenticated
      USING (public.is_superadmin())
      WITH CHECK (public.is_superadmin())
    $p$;
    EXECUTE $p$
      CREATE POLICY referral_attributions_superadmin_all
      ON public.referral_attributions FOR ALL TO authenticated
      USING (public.is_superadmin())
      WITH CHECK (public.is_superadmin())
    $p$;
    EXECUTE $p$
      CREATE POLICY referral_bonus_grants_superadmin_all
      ON public.referral_bonus_grants FOR ALL TO authenticated
      USING (public.is_superadmin())
      WITH CHECK (public.is_superadmin())
    $p$;
    EXECUTE $p$
      CREATE POLICY referral_events_superadmin_all
      ON public.referral_events FOR ALL TO authenticated
      USING (public.is_superadmin())
      WITH CHECK (public.is_superadmin())
    $p$;
  END IF;
END $$;

-- 5. Update private apply cap trigger
CREATE OR REPLACE FUNCTION public.tg_private_apply_daily_cap_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_cap  INT;
  v_used INT;
  v_bonus INT;
BEGIN
  SELECT subscription_tier INTO v_tier
    FROM public.profiles
   WHERE id = NEW.user_id;

  IF COALESCE(v_tier, 'FREE') = 'PRO_MAX' THEN
    SELECT COALESCE((config_value->>'max')::int, -1) INTO v_cap
      FROM public.dashboard_config
     WHERE config_key = 'private_apply_promax_max' AND is_active = true;
  ELSIF COALESCE(v_tier, 'FREE') = 'PRO' THEN
    SELECT COALESCE((config_value->>'max')::int, 50) INTO v_cap
      FROM public.dashboard_config
     WHERE config_key = 'private_apply_pro_max' AND is_active = true;
  ELSE
    SELECT COALESCE((config_value->>'max')::int, 15) INTO v_cap
      FROM public.dashboard_config
     WHERE config_key = 'private_apply_free_max' AND is_active = true;
  END IF;

  v_cap := COALESCE(v_cap, 15);

  v_bonus := COALESCE((public.referral_active_bonus_caps(NEW.user_id)->>'private_apply_per_day')::int, 0);

  IF v_cap = -1 THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_used
    FROM public.private_job_applies
   WHERE user_id = NEW.user_id
     AND created_at >= public.ist_today_start();

  IF v_used >= (v_cap + v_bonus) THEN
    RAISE EXCEPTION 'Daily apply limit reached (% of % allowed). Upgrade your plan for more applies.', v_used, v_cap + v_bonus;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.private_apply_slots_remaining()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_cap  INT;
  v_used INT;
  v_bonus INT;
  v_eff INT;
BEGIN
  SELECT subscription_tier INTO v_tier
    FROM public.profiles
   WHERE id = auth.uid();

  IF COALESCE(v_tier, 'FREE') = 'PRO_MAX' THEN
    SELECT COALESCE((config_value->>'max')::int, -1) INTO v_cap
      FROM public.dashboard_config
     WHERE config_key = 'private_apply_promax_max' AND is_active = true;
  ELSIF COALESCE(v_tier, 'FREE') = 'PRO' THEN
    SELECT COALESCE((config_value->>'max')::int, 50) INTO v_cap
      FROM public.dashboard_config
     WHERE config_key = 'private_apply_pro_max' AND is_active = true;
  ELSE
    SELECT COALESCE((config_value->>'max')::int, 15) INTO v_cap
      FROM public.dashboard_config
     WHERE config_key = 'private_apply_free_max' AND is_active = true;
  END IF;

  v_cap := COALESCE(v_cap, 15);

  v_bonus := COALESCE((public.referral_active_bonus_caps(auth.uid())->>'private_apply_per_day')::int, 0);
  v_eff := v_cap + v_bonus;

  SELECT count(*) INTO v_used
    FROM public.private_job_applies
   WHERE user_id = auth.uid()
     AND created_at >= public.ist_today_start();

  IF v_cap = -1 THEN
    RETURN jsonb_build_object('tier', COALESCE(v_tier, 'FREE'), 'used_today', v_used, 'max', -1, 'remaining', -1);
  END IF;

  RETURN jsonb_build_object(
    'tier', COALESCE(v_tier, 'FREE'),
    'used_today', v_used,
    'max', v_eff,
    'remaining', GREATEST(0, v_eff - v_used),
    'base_max', v_cap,
    'referral_bonus', v_bonus
  );
END;
$$;

-- 6. Govt job_tracker cap
CREATE OR REPLACE FUNCTION public.tg_job_tracker_cap_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_cap  INT;
  v_used INT;
  v_bonus INT;
BEGIN
  IF NEW.job_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT subscription_tier INTO v_tier
    FROM public.profiles
   WHERE id = NEW.user_id;

  IF v_tier = 'PRO_MAX' THEN
    RETURN NEW;
  END IF;

  IF v_tier = 'PRO' THEN
    SELECT COALESCE((config_value->>'max')::int, 5)
      INTO v_cap
      FROM public.dashboard_config
     WHERE config_key = 'govt_practice_pro_max' AND is_active = true;
  ELSE
    SELECT COALESCE((config_value->>'max')::int, 2)
      INTO v_cap
      FROM public.dashboard_config
     WHERE config_key = 'govt_practice_free_max' AND is_active = true;
  END IF;

  v_cap := COALESCE(v_cap, 2);

  v_bonus := COALESCE((public.referral_active_bonus_caps(NEW.user_id)->>'govt_tracker_extra')::int, 0);

  SELECT count(*) INTO v_used
    FROM public.job_tracker
   WHERE user_id = NEW.user_id
     AND job_id IS NOT NULL;

  IF v_used >= (v_cap + v_bonus) THEN
    RAISE EXCEPTION 'Tracker limit reached (% of % allowed). Upgrade your plan to track more jobs.', v_used, v_cap + v_bonus;
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Grants
GRANT EXECUTE ON FUNCTION public.referral_program_enabled() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.referral_bonus_duration_days() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.referral_pack_json_for_tier(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.referral_active_bonus_caps(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.effective_email_daily_cap(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.referral_on_referee_payment_success(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.referral_activate_queued_grants() TO service_role;
GRANT EXECUTE ON FUNCTION public.referral_ensure_my_link() TO authenticated;
GRANT EXECUTE ON FUNCTION public.referral_claim_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.referral_my_status() TO authenticated;

-- 8. Hourly: expire active grants and activate next queued grant per referrer
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
BEGIN
  PERFORM cron.unschedule('referral-activate-queued-grants');
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'referral cron unschedule: %', SQLERRM;
END;
$$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'referral-activate-queued-grants',
    '7 * * * *',
    $cron$
    SELECT public.referral_activate_queued_grants();
    $cron$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'referral cron not scheduled: %', SQLERRM;
END;
$$;

-- 1) Allow verify-razorpay-payment (service_role) to always run referral logic regardless of JWT uid quirks.
-- 2) Idempotent verify path will call the RPC again (INSERT events ON CONFLICT DO NOTHING is safe).
-- 3) Expose qualified referral count + program flag in referral_my_status for dashboard UX.

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
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_referee_id THEN
      IF NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'not allowed';
      END IF;
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
  v_qualified int;
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

  SELECT count(*)::int INTO v_qualified
  FROM public.referral_events
  WHERE referrer_user_id = v_uid
    AND event_type = 'qualified_payment';

  RETURN jsonb_build_object(
    'code', v_code,
    'active_grant', v_active,
    'queued_count', COALESCE(v_queued, 0),
    'qualified_referrals_count', COALESCE(v_qualified, 0),
    'program_enabled', public.referral_program_enabled()
  );
END;
$$;

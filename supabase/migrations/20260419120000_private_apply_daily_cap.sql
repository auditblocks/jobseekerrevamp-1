-- =====================================================
-- PRIVATE JOB DAILY APPLY CAPS
-- Tier-based daily limits: FREE/PRO have configurable caps;
-- PRO_MAX unlimited but still tracked for analytics.
-- Reset: midnight IST.
-- =====================================================

-- 1. Application tracking table
CREATE TABLE IF NOT EXISTS public.private_job_applies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    naukri_job_id UUID NOT NULL REFERENCES public.naukri_jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_private_apply_user_job
  ON public.private_job_applies (user_id, naukri_job_id);

CREATE INDEX IF NOT EXISTS idx_private_apply_user_day
  ON public.private_job_applies (user_id, created_at);


-- 2. RLS
ALTER TABLE public.private_job_applies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applies"
  ON public.private_job_applies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applies"
  ON public.private_job_applies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin') THEN
    EXECUTE 'CREATE POLICY "Superadmins manage private_job_applies" ON public.private_job_applies FOR ALL USING (public.is_superadmin())';
  END IF;
END $$;


-- 3. Config seeds
INSERT INTO public.dashboard_config (config_key, config_value, display_order, is_active)
VALUES
  ('private_apply_free_max',   '{"max": 15}'::jsonb, 92, true),
  ('private_apply_pro_max',    '{"max": 50}'::jsonb, 93, true),
  ('private_apply_promax_max', '{"max": -1}'::jsonb, 94, true)
ON CONFLICT (config_key) DO NOTHING;


-- 4. IST today-start helper (reusable)
CREATE OR REPLACE FUNCTION public.ist_today_start()
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';
$$;


-- 5. BEFORE INSERT trigger — enforce daily cap
CREATE OR REPLACE FUNCTION public.tg_private_apply_daily_cap_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier TEXT;
  v_cap  INT;
  v_used INT;
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

  -- -1 means unlimited (still tracked)
  IF v_cap = -1 THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_used
    FROM public.private_job_applies
   WHERE user_id = NEW.user_id
     AND created_at >= public.ist_today_start();

  IF v_used >= v_cap THEN
    RAISE EXCEPTION 'Daily apply limit reached (% of % allowed). Upgrade your plan for more applies.', v_used, v_cap;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_private_apply_daily_cap ON public.private_job_applies;
CREATE TRIGGER tg_private_apply_daily_cap
  BEFORE INSERT ON public.private_job_applies
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_private_apply_daily_cap_check();


-- 6. RPC: slots remaining
CREATE OR REPLACE FUNCTION public.private_apply_slots_remaining()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_tier TEXT;
  v_cap  INT;
  v_used INT;
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
    'max', v_cap,
    'remaining', GREATEST(0, v_cap - v_used)
  );
END;
$$;

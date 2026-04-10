-- =====================================================
-- GOVT PRACTICE TRACKER GATES
-- Tier-based access: FREE/PRO = tracker + configurable cap;
-- PRO_MAX = unlimited practice, no tracker requirement.
-- =====================================================

-- 1. Config rows (public-readable via existing "Public can view active dashboard config" policy)
INSERT INTO public.dashboard_config (config_key, config_value, display_order, is_active)
VALUES
  ('govt_practice_free_max', '{"max": 2}'::jsonb, 90, true),
  ('govt_practice_pro_max',  '{"max": 5}'::jsonb, 91, true)
ON CONFLICT (config_key) DO NOTHING;


-- 2. Remove duplicate (user_id, job_id) rows, keeping the earliest entry
DELETE FROM public.job_tracker a
  USING public.job_tracker b
  WHERE a.user_id = b.user_id
    AND a.job_id  = b.job_id
    AND a.job_id IS NOT NULL
    AND a.created_at > b.created_at;

-- Partial unique index: one tracker row per (user, govt_job)
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_tracker_user_job_unique
  ON public.job_tracker (user_id, job_id)
  WHERE job_id IS NOT NULL;


-- 3. Change FK from ON DELETE SET NULL → ON DELETE CASCADE
--    so delisted jobs auto-remove tracker rows.
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
   WHERE tc.table_name = 'job_tracker'
     AND tc.constraint_type = 'FOREIGN KEY'
     AND kcu.column_name = 'job_id'
   LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.job_tracker DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE public.job_tracker
    ADD CONSTRAINT job_tracker_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES public.govt_jobs(id) ON DELETE CASCADE;
END $$;


-- 4. Entitlement helper: can user read exam content for this job_id?
CREATE OR REPLACE FUNCTION public.govt_practice_entitled(p_job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = auth.uid()
       AND subscription_tier = 'PRO_MAX'
  )
  OR EXISTS (
    SELECT 1 FROM public.job_tracker
     WHERE user_id = auth.uid()
       AND job_id = p_job_id
  );
$$;


-- 5. BEFORE INSERT trigger on job_tracker — enforce per-tier cap
CREATE OR REPLACE FUNCTION public.tg_job_tracker_cap_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier TEXT;
  v_cap  INT;
  v_used INT;
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

  SELECT count(*) INTO v_used
    FROM public.job_tracker
   WHERE user_id = NEW.user_id
     AND job_id IS NOT NULL;

  IF v_used >= v_cap THEN
    RAISE EXCEPTION 'Tracker limit reached (% of % allowed). Upgrade your plan to track more jobs.', v_used, v_cap;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_job_tracker_cap ON public.job_tracker;
CREATE TRIGGER tg_job_tracker_cap
  BEFORE INSERT ON public.job_tracker
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_job_tracker_cap_check();


-- 6. BEFORE DELETE trigger on job_tracker — block delete for FREE tier
CREATE OR REPLACE FUNCTION public.tg_job_tracker_delete_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  IF public.is_superadmin() THEN
    RETURN OLD;
  END IF;

  SELECT subscription_tier INTO v_tier
    FROM public.profiles
   WHERE id = OLD.user_id;

  IF COALESCE(v_tier, 'FREE') = 'FREE' THEN
    RAISE EXCEPTION 'Free-tier users cannot remove jobs from the tracker. Upgrade to PRO to manage your tracker.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS tg_job_tracker_delete_guard ON public.job_tracker;
CREATE TRIGGER tg_job_tracker_delete_guard
  BEFORE DELETE ON public.job_tracker
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_job_tracker_delete_guard();


-- 7. exam_questions RLS — replace open SELECT with entitled check
DROP POLICY IF EXISTS "Anyone can view exam_questions" ON public.exam_questions;

CREATE POLICY "Entitled users can view exam_questions"
  ON public.exam_questions FOR SELECT
  TO authenticated
  USING (public.govt_practice_entitled(job_id));

-- Keep existing admin policy (Admins can manage exam_questions) — it covers superadmin ALL.


-- 8. user_exams RLS — split the broad FOR ALL into granular policies
DROP POLICY IF EXISTS "Users can manage their own exams" ON public.user_exams;

CREATE POLICY "Users can view own exams"
  ON public.user_exams FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entitled exams"
  ON public.user_exams FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.govt_practice_entitled(job_id)
  );

CREATE POLICY "Users can update own exams"
  ON public.user_exams FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exams"
  ON public.user_exams FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- 9. RPC: slots remaining (avoids duplicating tier logic in client)
CREATE OR REPLACE FUNCTION public.govt_practice_slots_remaining()
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

  IF v_tier = 'PRO_MAX' THEN
    RETURN jsonb_build_object('tier', v_tier, 'used', 0, 'max', -1, 'remaining', -1);
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

  SELECT count(*) INTO v_used
    FROM public.job_tracker
   WHERE user_id = auth.uid()
     AND job_id IS NOT NULL;

  RETURN jsonb_build_object(
    'tier', COALESCE(v_tier, 'FREE'),
    'used', v_used,
    'max', v_cap,
    'remaining', GREATEST(0, v_cap - v_used)
  );
END;
$$;

-- Account access: suspension end time + prevent non-admins from changing status/role/suspension.
-- Suspensions are enforced in the app after auth; banned users stay blocked until status changes.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.suspended_until IS 'When status is suspended, login is blocked until this time (UTC). Cleared when suspension is lifted or expires.';

-- Called by the app for the current user before reading profile; lifts expired suspensions.
CREATE OR REPLACE FUNCTION public.clear_expired_user_suspension(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RETURN;
  END IF;

  UPDATE public.profiles
  SET
    status = 'active',
    suspended_until = NULL,
    updated_at = NOW()
  WHERE id = p_user_id
    AND status = 'suspended'
    AND suspended_until IS NOT NULL
    AND suspended_until <= NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.clear_expired_user_suspension(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_expired_user_suspension(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.profiles_prevent_status_escalation_by_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.is_superadmin() THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status
     OR OLD.suspended_until IS DISTINCT FROM NEW.suspended_until
     OR OLD.role IS DISTINCT FROM NEW.role THEN
    IF auth.uid() = NEW.id
       AND OLD.status = 'suspended'
       AND NEW.status = 'active'
       AND NEW.suspended_until IS NULL
       AND OLD.suspended_until IS NOT NULL
       AND OLD.suspended_until <= NOW()
       AND OLD.role IS NOT DISTINCT FROM NEW.role THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'You cannot change account status, suspension, or role';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_status_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_status_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_prevent_status_escalation_by_user();

DROP FUNCTION IF EXISTS public.admin_get_all_users();

CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  role text,
  status text,
  subscription_tier text,
  is_elite_member boolean,
  suspended_until timestamptz,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Access Denied: Not a superadmin.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.email,
    p.role,
    p.status,
    p.subscription_tier,
    COALESCE(p.is_elite_member, false) AS is_elite_member,
    p.suspended_until,
    p.created_at,
    au.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$;

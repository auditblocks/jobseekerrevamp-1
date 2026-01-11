-- ============================================
-- FIX ADMIN ACCESS ISSUES
-- Fixes RLS policies to allow admins to view/delete users, recruiters, and subscriptions
-- ============================================

-- ===========================================
-- PART 1: FIX is_superadmin() FUNCTION
-- ===========================================

-- Ensure is_superadmin checks user_roles table correctly
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
BEGIN
  -- First check user_roles table for admin role (most reliable)
  -- Note: app_role enum only has 'admin', 'moderator', 'user' - no 'superadmin'
  IF EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;
  
  -- Fallback: Check JWT user_metadata for superadmin role
  IF COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'superadmin', false) THEN
    RETURN true;
  END IF;
  
  -- Fallback: Check auth.users raw_user_meta_data
  IF EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND COALESCE(auth.users.raw_user_meta_data->>'role', 'user') = 'superadmin'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- ===========================================
-- PART 2: ADD MISSING DELETE POLICIES
-- ===========================================

-- Add DELETE policy for subscription_history (admins can delete)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_history' AND policyname = 'Superadmins can delete subscription history') THEN
    CREATE POLICY "Superadmins can delete subscription history"
    ON public.subscription_history FOR DELETE
    TO authenticated
    USING (public.is_superadmin());
  END IF;
END $$;

-- Add UPDATE policy for subscription_history (admins can update)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_history' AND policyname = 'Superadmins can update subscription history') THEN
    CREATE POLICY "Superadmins can update subscription history"
    ON public.subscription_history FOR UPDATE
    TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());
  END IF;
END $$;

-- ===========================================
-- PART 3: ENSURE ADMIN POLICIES FOR PROFILES
-- ===========================================

-- Verify profiles admin policy includes all operations
-- The existing "Superadmins can manage all profiles" should cover DELETE, but let's ensure it exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Superadmins can manage all profiles') THEN
    CREATE POLICY "Superadmins can manage all profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());
  END IF;
END $$;

-- ===========================================
-- PART 4: ENSURE ADMIN POLICIES FOR RECRUITERS
-- ===========================================

-- Verify recruiters admin policy exists (should already exist, but ensure it's correct)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruiters' AND policyname = 'Superadmins can manage recruiters') THEN
    CREATE POLICY "Superadmins can manage recruiters"
    ON public.recruiters FOR ALL
    TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());
  END IF;
END $$;

-- ===========================================
-- PART 5: ADD ADMIN VIEW POLICY FOR ALL PROFILES
-- ===========================================

-- Ensure admins can view all profiles (for user count in dashboard)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Superadmins can view all profiles') THEN
    CREATE POLICY "Superadmins can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_superadmin());
  END IF;
END $$;

-- ===========================================
-- PART 6: VERIFY USER_ROLES POLICY ALLOWS ADMIN ACCESS
-- ===========================================

-- Ensure admins can view user_roles to check their own admin status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can view all roles') THEN
    CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
      )
    );
  END IF;
END $$;

-- ===========================================
-- PART 7: ENSURE RECRUITERS POLICY EXISTS
-- ===========================================

-- Verify recruiters SELECT policy allows all authenticated users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruiters' AND policyname = 'Authenticated users can view recruiters') THEN
    CREATE POLICY "Authenticated users can view recruiters"
    ON public.recruiters FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON FUNCTION public.is_superadmin() IS 'Checks if current user is admin or superadmin via user_roles table or JWT metadata';

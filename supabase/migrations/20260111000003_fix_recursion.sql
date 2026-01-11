-- ============================================
-- FIX RECURSIVE POLICIES
-- Resolves 500 errors caused by infinite recursion in RLS policies
-- ============================================

-- 1. Fix user_roles policy (was recursively checking user_roles)
-- Replaces subquery with is_superadmin() function which is SECURITY DEFINER
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (public.is_superadmin());

-- 2. Fix email_cooldowns policies (was recursively checking user_roles)
DROP POLICY IF EXISTS "Admins can view all cooldowns" ON public.email_cooldowns;

CREATE POLICY "Admins can view all cooldowns" 
ON public.email_cooldowns 
FOR SELECT 
USING (public.is_superadmin());

DROP POLICY IF EXISTS "Admins can delete cooldowns" ON public.email_cooldowns;

CREATE POLICY "Admins can delete cooldowns" 
ON public.email_cooldowns 
FOR DELETE 
USING (public.is_superadmin());

-- Comments
COMMENT ON POLICY "Admins can view all roles" ON public.user_roles IS 'Allows admins to view all roles without recursion using is_superadmin()';

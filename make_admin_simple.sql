-- =====================================================
-- STEP 1: Check existing users
-- Run this first to see all registered users
-- =====================================================
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- =====================================================
-- STEP 2: Make a user admin (replace email with actual email from Step 1)
-- =====================================================

-- Replace 'actual-email@example.com' with an email from the list above
INSERT INTO public.user_roles (user_id, role)
SELECT 
    id as user_id,
    'admin'::app_role as role
FROM auth.users
WHERE email = 'actual-email@example.com'  -- CHANGE THIS
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles
SET 
    role = 'superadmin',
    updated_at = NOW()
WHERE email = 'actual-email@example.com';  -- CHANGE THIS

-- =====================================================
-- STEP 3: Verify admin was created
-- =====================================================
SELECT 
    u.email,
    ur.role as app_role,
    p.role as profile_role,
    p.name
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.role = 'admin'
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'actual-email@example.com';  -- CHANGE THIS


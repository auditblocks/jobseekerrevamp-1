-- =====================================================
-- MAKE USER ADMIN - COMPLETE SCRIPT
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ypmyzbtgossmizklszek/sql/new
-- =====================================================

-- STEP 1: First, see all users to find the email you want
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- STEP 2: Replace 'your-email@example.com' below with the actual email from Step 1, then run:

-- Make user admin in user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT 
    id as user_id,
    'admin'::app_role as role
FROM auth.users
WHERE email = 'your-email@example.com'  -- ⬅️ CHANGE THIS EMAIL
ON CONFLICT (user_id, role) DO NOTHING;

-- Update profile to superadmin
UPDATE public.profiles
SET 
    role = 'superadmin',
    updated_at = NOW()
WHERE email = 'your-email@example.com';  -- ⬅️ CHANGE THIS EMAIL

-- STEP 3: Verify the admin was created
SELECT 
    u.email,
    u.id as user_id,
    ur.role as app_role,
    p.role as profile_role,
    p.name,
    CASE 
        WHEN ur.role = 'admin' AND p.role = 'superadmin' THEN '✅ FULL ADMIN ACCESS'
        WHEN ur.role = 'admin' THEN '⚠️ Admin role but profile not superadmin'
        WHEN p.role = 'superadmin' THEN '⚠️ Profile superadmin but no admin role'
        ELSE '❌ NOT ADMIN'
    END as admin_status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.role = 'admin'
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'your-email@example.com';  -- ⬅️ CHANGE THIS EMAIL


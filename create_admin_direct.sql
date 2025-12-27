-- =====================================================
-- DIRECT ADMIN CREATION SCRIPT
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: List all users to find the one you want to make admin
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Replace 'YOUR_EMAIL_HERE' with actual email from above, then run:

-- Make user admin
INSERT INTO public.user_roles (user_id, role)
SELECT 
    id as user_id,
    'admin'::app_role as role
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'  -- CHANGE THIS
ON CONFLICT (user_id, role) DO NOTHING;

-- Update profile to superadmin
UPDATE public.profiles
SET 
    role = 'superadmin',
    updated_at = NOW()
WHERE email = 'YOUR_EMAIL_HERE';  -- CHANGE THIS

-- Step 3: Verify admin was created
SELECT 
    u.email,
    u.id,
    ur.role as app_role,
    p.role as profile_role,
    p.name,
    CASE 
        WHEN ur.role = 'admin' THEN '✅ Admin Role'
        ELSE '❌ No Admin Role'
    END as status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.role = 'admin'
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'YOUR_EMAIL_HERE';  -- CHANGE THIS


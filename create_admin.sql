-- =====================================================
-- CREATE ADMIN ACCOUNT IN SUPABASE
-- =====================================================
-- 
-- OPTION 1: Make an EXISTING user an admin (by email)
-- Replace 'your-email@example.com' with the actual email
-- =====================================================

-- Step 1: Insert admin role into user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT 
    id as user_id,
    'admin'::app_role as role
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 2: Update profile to superadmin (optional but recommended)
UPDATE public.profiles
SET 
    role = 'superadmin',
    updated_at = NOW()
WHERE email = 'your-email@example.com';

-- =====================================================
-- OPTION 2: Create a NEW admin user (if user doesn't exist)
-- Replace the values below with your desired admin details
-- =====================================================

-- First, you need to create the user in Supabase Auth Dashboard
-- OR use the Supabase Auth API to create the user
-- Then run the SQL below with the user's UUID

-- After user is created, get their UUID and run:
/*
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_UUID_HERE', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles
SET 
    role = 'superadmin',
    updated_at = NOW()
WHERE id = 'USER_UUID_HERE';
*/

-- =====================================================
-- OPTION 3: Find user by email and make admin (Complete script)
-- =====================================================

DO $$
DECLARE
    user_uuid UUID;
    user_email TEXT := 'your-email@example.com'; -- CHANGE THIS
BEGIN
    -- Find user by email
    SELECT id INTO user_uuid
    FROM auth.users
    WHERE email = user_email;
    
    -- Check if user exists
    IF user_uuid IS NULL THEN
        RAISE NOTICE 'User with email % not found.', user_email;
        RAISE NOTICE 'Please sign up first at: https://jobseekerrevamp-1.vercel.app/auth';
        RAISE NOTICE 'Or check existing users with: SELECT email FROM auth.users;';
        RETURN;
    END IF;
    
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_uuid, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Update profile to superadmin
    UPDATE public.profiles
    SET 
        role = 'superadmin',
        updated_at = NOW()
    WHERE id = user_uuid;
    
    RAISE NOTICE 'Success! User % has been granted admin privileges!', user_email;
END $$;

-- =====================================================
-- OPTION 4: List all existing users (to find your email)
-- =====================================================

-- Run this first to see all registered users:
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- =====================================================
-- OPTION 5: Make admin by user UUID (if you know the UUID)
-- =====================================================

-- If you know the user's UUID from the query above, use this:
/*
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_UUID_HERE', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles
SET 
    role = 'superadmin',
    updated_at = NOW()
WHERE id = 'USER_UUID_HERE';
*/

-- =====================================================
-- VERIFY ADMIN STATUS
-- =====================================================

-- Check if user has admin role
SELECT 
    u.email,
    ur.role as app_role,
    p.role as profile_role,
    p.name
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'your-email@example.com'; -- CHANGE THIS


-- =====================================================
-- FIX ALL USER PASSWORDS
-- =====================================================
-- Reset passwords for ALL users with correct encryption
-- =====================================================

-- Fix ALL teachers
UPDATE auth.users 
SET encrypted_password = crypt('Teacher123!', gen_salt('bf')),
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE id IN (SELECT id FROM profiles WHERE role = 'teacher');

-- Fix ALL parents
UPDATE auth.users 
SET encrypted_password = crypt('Parent123!', gen_salt('bf')),
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE id IN (SELECT id FROM profiles WHERE role = 'parent');

-- Fix ALL students
UPDATE auth.users 
SET encrypted_password = crypt('Student123!', gen_salt('bf')),
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE id IN (SELECT id FROM profiles WHERE role = 'student');

-- Fix school admins (just to be sure)
UPDATE auth.users 
SET encrypted_password = crypt('Admin123!', gen_salt('bf')),
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE id IN (SELECT id FROM profiles WHERE role = 'school_admin');

-- Verification - test a few accounts
SELECT 
  'VERIFICATION' as test_type,
  au.email,
  p.username,
  p.role,
  CASE 
    WHEN p.role = 'teacher' AND au.encrypted_password = crypt('Teacher123!', au.encrypted_password) THEN 'FIXED'
    WHEN p.role = 'parent' AND au.encrypted_password = crypt('Parent123!', au.encrypted_password) THEN 'FIXED'
    WHEN p.role = 'student' AND au.encrypted_password = crypt('Student123!', au.encrypted_password) THEN 'FIXED'
    WHEN p.role = 'school_admin' AND au.encrypted_password = crypt('Admin123!', au.encrypted_password) THEN 'FIXED'
    ELSE 'STILL BROKEN'
  END as status
FROM auth.users au
JOIN profiles p ON au.id = p.id
WHERE p.username IN (
  'STMP001-AD-00000001',
  'CHUR001-AD-00000001',
  'STMP001-TC-10000001',
  'CHUR001-TC-20000001',
  'HARE001-TC-30000002',
  'STMP001-PR-10000001',
  'CHUR001-PR-20000001',
  'HARE001-PR-30000002',
  'STMP001-ST-10000001',
  'CHUR001-ST-20000001',
  'HARE001-ST-30000001'
)
ORDER BY p.role, p.username;

-- Show total users fixed
SELECT 
  'SUMMARY' as report,
  role,
  COUNT(*) as users_fixed
FROM profiles
WHERE role IN ('teacher', 'parent', 'student', 'school_admin')
GROUP BY role
ORDER BY role;

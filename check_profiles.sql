-- Check existing profiles
SELECT id, email, username, full_name, role, school_id, account_status 
FROM profiles 
ORDER BY created_at DESC
LIMIT 20;

-- Check if super admin exists
SELECT * FROM profiles WHERE role = 'super_admin';

-- Check auth users
SELECT id, email, created_at FROM auth.users LIMIT 20;

-- If your super admin profile is missing, you can recreate it:
-- First, find your auth user id (from the auth.users query above)
-- Then insert the profile:

-- EXAMPLE (replace the values with your actual data):
/*
INSERT INTO profiles (
  id,              -- must match the auth.users id
  email,
  username,
  full_name,
  role,
  account_status,
  created_at,
  updated_at
) VALUES (
  'YOUR-AUTH-USER-ID-HERE',
  'superadmin@robokorda.com',
  'SA-ROBOKORDA-001',
  'Super Admin',
  'super_admin',
  'active',
  NOW(),
  NOW()
);
*/

-- Or update existing profile if it exists but has wrong username:
/*
UPDATE profiles 
SET username = 'SA-ROBOKORDA-001'
WHERE email = 'superadmin@robokorda.com';
*/

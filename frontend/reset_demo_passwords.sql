-- =====================================================
-- RESET PASSWORDS FOR DEMO ACCOUNTS
-- =====================================================
-- This will reset passwords for key demo accounts
-- =====================================================

-- Update passwords for school admins
UPDATE auth.users 
SET encrypted_password = crypt('Admin123!', gen_salt('bf')),
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email IN (
  'admin@stmarys.test',
  'admin@churchill.test'
);

-- Update passwords for sample teachers
UPDATE auth.users 
SET encrypted_password = crypt('Teacher123!', gen_salt('bf')),
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email IN (
  'mrs.chipo.moyo@stmarys.test',
  'mr.tanaka.ncube@stmarys.test',
  'mrs.ruvimbo.dube@stmarys.test',
  'mrs.nyasha.khumalo@churchill.test',
  'mr.simbarashe.mpofu@churchill.test',
  'mrs.tatenda.nkomo@churchill.test',
  'mrs.panashe.gumede@hararehigh.test',
  'mr.munashe.shoko@hararehigh.test',
  'mr.tinotenda.marova@hararehigh.test'
);

-- Update passwords for sample parents
UPDATE auth.users 
SET encrypted_password = crypt('Parent123!', gen_salt('bf')),
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email IN (
  'parent.moyo1@stmarys.test',
  'parent.ncube@stmarys.test',
  'parent.khumalo@churchill.test',
  'parent.mpofu@churchill.test',
  'parent.gumede@hararehigh.test',
  'parent.shoko@hararehigh.test'
);

-- Update passwords for sample students (first 10 from each school)
UPDATE auth.users 
SET encrypted_password = crypt('Student123!', gen_salt('bf')),
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email LIKE 'stmp.%@eschools.test'
   OR email LIKE 'chur.%@eschools.test'
   OR email LIKE 'hare.%@eschools.test';

-- Verification - show updated accounts
SELECT 
  'PASSWORD RESET COMPLETE' as status,
  COUNT(*) as users_updated
FROM auth.users
WHERE email LIKE '%@stmarys.test'
   OR email LIKE '%@churchill.test'
   OR email LIKE '%@hararehigh.test'
   OR email LIKE '%@eschools.test';

-- Show sample logins that should now work
SELECT 
  'DEMO ACCOUNTS' as type,
  p.username,
  p.email,
  p.role,
  CASE p.role
    WHEN 'school_admin' THEN 'Admin123!'
    WHEN 'teacher' THEN 'Teacher123!'
    WHEN 'parent' THEN 'Parent123!'
    WHEN 'student' THEN 'Student123!'
  END as password
FROM profiles p
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

-- =====================================================
-- VERIFY AND FIX AUTHENTICATION
-- =====================================================
-- Check if users exist and can authenticate
-- =====================================================

-- Check sample accounts
SELECT 
  'VERIFICATION REPORT' as report_type,
  username,
  email,
  role,
  CASE 
    WHEN id IN (SELECT id FROM auth.users) THEN 'EXISTS IN AUTH'
    ELSE 'MISSING FROM AUTH'
  END as auth_status
FROM profiles
WHERE username IN (
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
ORDER BY role, username;

-- Count users by role
SELECT 
  'USER COUNTS' as report_type,
  role,
  COUNT(*) as profile_count,
  COUNT(CASE WHEN id IN (SELECT id FROM auth.users) THEN 1 END) as auth_count
FROM profiles
GROUP BY role
ORDER BY role;

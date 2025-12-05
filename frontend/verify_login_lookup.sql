-- =====================================================
-- VERIFY LOGIN LOOKUP
-- =====================================================
-- Test if username lookup works correctly
-- =====================================================

-- Test username lookups
SELECT 
  'USERNAME LOOKUP TEST' as test_type,
  username,
  email,
  role,
  school_id
FROM profiles
WHERE username IN (
  'STMP001-AD-00000001',
  'CHUR001-AD-00000001',
  'STMP001-TC-10000001',
  'SA-00000001',
  'HARE001-AD-00000001'
)
ORDER BY username;

-- Verify original accounts still work
SELECT 
  'ORIGINAL ACCOUNTS' as test_type,
  p.username,
  p.email,
  p.role,
  CASE WHEN a.id IS NOT NULL THEN 'YES' ELSE 'NO' END as exists_in_auth
FROM profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE p.username IN ('SA-00000001', 'HARE001-AD-00000001', 'HARE001-TC-00000001')
ORDER BY p.username;

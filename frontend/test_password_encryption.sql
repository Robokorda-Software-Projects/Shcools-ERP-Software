-- Test if passwords are correctly encrypted
SELECT 
  'PASSWORD TEST' as test_type,
  au.email,
  p.username,
  CASE 
    WHEN au.encrypted_password = crypt('Admin123!', au.encrypted_password) THEN 'MATCH'
    ELSE 'NO MATCH'
  END as password_check,
  au.email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users au
JOIN profiles p ON au.id = p.id
WHERE au.email IN (
  'admin@stmarys.test',
  'admin@churchill.test',
  'mrs.chipo.moyo@stmarys.test',
  'parent.moyo1@stmarys.test'
)
ORDER BY p.role, au.email;

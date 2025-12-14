-- =====================================================
-- CLEANUP ORPHANED AUTH USERS
-- =====================================================
-- Run this in Supabase SQL Editor to delete auth users 
-- that don't have a corresponding profile
-- =====================================================

-- First, see which auth users exist
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- See which profiles exist
SELECT id, email, username, role FROM profiles;

-- Find orphaned auth users (auth users without a profile)
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- =====================================================
-- TO DELETE ORPHANED AUTH USERS:
-- You cannot delete auth.users directly via SQL.
-- You need to do it via Supabase Dashboard:
-- 
-- 1. Go to Authentication > Users
-- 2. Find the users you want to delete
-- 3. Click the three dots menu > Delete user
--
-- OR use the Admin API (which our new endpoint does)
-- =====================================================

-- List all auth users that are NOT the super admin
-- These are the ones you might want to delete
SELECT au.id, au.email
FROM auth.users au
WHERE au.email != 'superadmin@robokorda.com'
  AND au.email != 'superadmin@eschools.com';

-- =====================================================
-- QUICK FIX: If you want to keep it simple, just delete
-- all users from Supabase Dashboard > Authentication > Users
-- EXCEPT for your super admin account
-- =====================================================

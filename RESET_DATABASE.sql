-- =====================================================
-- CLEAN SLATE - Reset Database (Keep Super Admin Only)
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- STEP 1: Disable RLS temporarily for cleanup (optional, makes it easier)
-- ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- STEP 2: Delete all data in order (respecting foreign keys)

-- Delete audit logs first
DELETE FROM system_audit_log;

-- Delete exam results
DELETE FROM exam_results;

-- Delete exams
DELETE FROM exams;

-- Delete assignment submissions
DELETE FROM assignment_submissions;

-- Delete assignments
DELETE FROM assignments;

-- Delete attendance records
DELETE FROM attendance;

-- Delete lesson plans
DELETE FROM lesson_plans;

-- Delete notifications
DELETE FROM notifications;

-- Delete teacher subject assignments
DELETE FROM teacher_subject_assignments;

-- Delete class subject assignments
DELETE FROM class_subject_assignments;

-- Delete subjects
DELETE FROM subjects;

-- Delete students
DELETE FROM students;

-- Delete classes
DELETE FROM classes;

-- Delete school subscriptions
DELETE FROM school_subscriptions;

-- Delete school admin accounts (legacy table if exists)
DELETE FROM school_admin_accounts;

-- Delete all profiles EXCEPT super_admin
DELETE FROM profiles WHERE role != 'super_admin';

-- Delete all schools
DELETE FROM schools;

-- STEP 3: Verify super admin is still there
SELECT id, email, username, full_name, role FROM profiles WHERE role = 'super_admin';

-- STEP 4: Check auth users (you may want to delete non-super-admin auth users too)
-- This shows all auth users - you'll need to manually delete unwanted ones from Authentication tab
SELECT id, email FROM auth.users;

-- =====================================================
-- STEP 5: FIX RLS POLICIES FOR SCHOOLS TABLE
-- =====================================================

-- First, check what policies exist
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'schools';

-- Drop existing restrictive policies on schools (if any)
DROP POLICY IF EXISTS "Schools are viewable by authenticated users" ON schools;
DROP POLICY IF EXISTS "Schools are insertable by super_admin" ON schools;
DROP POLICY IF EXISTS "Schools are updatable by super_admin" ON schools;
DROP POLICY IF EXISTS "Schools are deletable by super_admin" ON schools;

-- Create proper RLS policies for schools

-- Allow anyone authenticated to view schools
CREATE POLICY "Anyone can view schools" ON schools
FOR SELECT
TO authenticated
USING (true);

-- Allow super_admin to insert schools
CREATE POLICY "Super admin can insert schools" ON schools
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- Allow super_admin to update schools
CREATE POLICY "Super admin can update schools" ON schools
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- Allow super_admin to delete schools
CREATE POLICY "Super admin can delete schools" ON schools
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- =====================================================
-- STEP 6: FIX RLS POLICIES FOR PROFILES TABLE
-- =====================================================

-- Check existing policies
SELECT policyname FROM pg_policies WHERE tablename = 'profiles';

-- Drop existing policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Allow public to read profiles for login" ON profiles;

-- Allow public to read profiles (needed for login by username)
CREATE POLICY "Public can read profiles for login" ON profiles
FOR SELECT
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Allow super_admin to insert profiles
CREATE POLICY "Super admin can insert profiles" ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
  OR auth.uid() = id  -- Or inserting own profile
);

-- Allow super_admin to update any profile
CREATE POLICY "Super admin can update any profile" ON profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- =====================================================
-- STEP 7: FIX RLS FOR OTHER TABLES
-- =====================================================

-- Students table
DROP POLICY IF EXISTS "Students viewable by school members" ON students;
CREATE POLICY "Authenticated can view students" ON students
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin can manage students" ON students
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
);

-- Classes table
DROP POLICY IF EXISTS "Classes viewable by school members" ON classes;
CREATE POLICY "Authenticated can view classes" ON classes
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin can manage classes" ON classes
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
);

-- Subjects table
DROP POLICY IF EXISTS "Subjects viewable by school members" ON subjects;
CREATE POLICY "Authenticated can view subjects" ON subjects
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin can manage subjects" ON subjects
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
);

-- System audit log
DROP POLICY IF EXISTS "Audit logs viewable by admins" ON system_audit_log;
CREATE POLICY "Super admin can manage audit logs" ON system_audit_log
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
);

-- =====================================================
-- STEP 8: VERIFY EVERYTHING IS CLEAN
-- =====================================================

SELECT 'schools' as table_name, COUNT(*) as count FROM schools
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'classes', COUNT(*) FROM classes
UNION ALL
SELECT 'subjects', COUNT(*) FROM subjects
UNION ALL
SELECT 'exams', COUNT(*) FROM exams;

-- =====================================================
-- DONE! You should now be able to:
-- 1. Log in as super admin
-- 2. See schools (empty list)
-- 3. Create new schools
-- 4. Create admins for schools
-- =====================================================

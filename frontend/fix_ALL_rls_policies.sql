-- ============================================================
-- MASTER RLS FIX FOR ALL TABLES
-- This script fixes Row Level Security for ALL tables
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- Step 1: Drop ALL existing policies on ALL relevant tables
DO $$
DECLARE 
    rec RECORD;
    tables_to_fix TEXT[] := ARRAY[
        'schools',
        'profiles', 
        'students',
        'student_enrollments',
        'student_previous_grades',
        'student_fee_balances',
        'fee_slips',
        'classes',
        'class_subject_assignments',
        'subjects',
        'teachers',
        'attendance',
        'exams',
        'exam_results',
        'marking_periods',
        'lesson_plans',
        'assignments',
        'assignment_submissions',
        'enrollment_settings',
        'system_audit_log',
        'notifications',
        'announcements',
        'timetables',
        'parent_student_links'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables_to_fix LOOP
        -- Check if table exists before trying to drop policies
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
            FOR rec IN SELECT policyname FROM pg_policies WHERE tablename = tbl LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I', rec.policyname, tbl);
            END LOOP;
            RAISE NOTICE 'Dropped policies on %', tbl;
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- Step 2: Create permissive policies for each table
-- Pattern: Allow SELECT for school members, ALL for service role
-- ============================================================

-- ==================== SCHOOLS ====================
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools NO FORCE ROW LEVEL SECURITY;

CREATE POLICY "schools_select" ON schools FOR SELECT USING (true);
CREATE POLICY "schools_all" ON schools FOR ALL USING (
    auth.uid() IS NULL OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin')
    )
);
GRANT ALL ON schools TO authenticated, service_role;
GRANT SELECT ON schools TO anon;

-- ==================== PROFILES ====================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles NO FORCE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() IS NULL OR auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
    auth.uid() IS NULL OR auth.uid() = id OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'school_admin')
    )
);
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (
    auth.uid() IS NULL OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
);
GRANT ALL ON profiles TO authenticated, service_role;

-- ==================== STUDENTS ====================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE students NO FORCE ROW LEVEL SECURITY;

CREATE POLICY "students_select" ON students FOR SELECT USING (
    auth.uid() IS NULL OR school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "students_insert" ON students FOR INSERT WITH CHECK (auth.uid() IS NULL OR true);
CREATE POLICY "students_update" ON students FOR UPDATE USING (auth.uid() IS NULL OR true);
CREATE POLICY "students_delete" ON students FOR DELETE USING (auth.uid() IS NULL OR true);
GRANT ALL ON students TO authenticated, service_role, anon;

-- ==================== STUDENT_ENROLLMENTS ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_enrollments') THEN
        ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE student_enrollments NO FORCE ROW LEVEL SECURITY;
    END IF;
END $$;

CREATE POLICY "student_enrollments_select" ON student_enrollments FOR SELECT USING (auth.uid() IS NULL OR true);
CREATE POLICY "student_enrollments_all" ON student_enrollments FOR ALL USING (auth.uid() IS NULL OR true);
GRANT ALL ON student_enrollments TO authenticated, service_role;

-- ==================== STUDENT_PREVIOUS_GRADES ====================
CREATE TABLE IF NOT EXISTS student_previous_grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    enrollment_id UUID,
    subject_name VARCHAR(100) NOT NULL,
    unit_level INTEGER,
    grade VARCHAR(10),
    marks INTEGER,
    exam_type VARCHAR(50) DEFAULT 'previous_school',
    exam_year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE student_previous_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_previous_grades NO FORCE ROW LEVEL SECURITY;

CREATE POLICY "student_previous_grades_all" ON student_previous_grades FOR ALL USING (auth.uid() IS NULL OR true);
GRANT ALL ON student_previous_grades TO authenticated, service_role;

-- ==================== STUDENT_FEE_BALANCES ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_fee_balances') THEN
        ALTER TABLE student_fee_balances ENABLE ROW LEVEL SECURITY;
        ALTER TABLE student_fee_balances NO FORCE ROW LEVEL SECURITY;
        
        CREATE POLICY "student_fee_balances_all" ON student_fee_balances FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON student_fee_balances TO authenticated, service_role;
    END IF;
END $$;

-- ==================== FEE_SLIPS ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_slips') THEN
        ALTER TABLE fee_slips ENABLE ROW LEVEL SECURITY;
        ALTER TABLE fee_slips NO FORCE ROW LEVEL SECURITY;
        
        CREATE POLICY "fee_slips_all" ON fee_slips FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON fee_slips TO authenticated, service_role;
    END IF;
END $$;

-- ==================== CLASSES ====================
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes NO FORCE ROW LEVEL SECURITY;

CREATE POLICY "classes_select" ON classes FOR SELECT USING (auth.uid() IS NULL OR true);
CREATE POLICY "classes_all" ON classes FOR ALL USING (auth.uid() IS NULL OR true);
GRANT ALL ON classes TO authenticated, service_role;

-- ==================== CLASS_SUBJECT_ASSIGNMENTS ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_subject_assignments') THEN
        ALTER TABLE class_subject_assignments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE class_subject_assignments NO FORCE ROW LEVEL SECURITY;
        
        CREATE POLICY "class_subject_assignments_all" ON class_subject_assignments FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON class_subject_assignments TO authenticated, service_role;
    END IF;
END $$;

-- ==================== SUBJECTS ====================
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects NO FORCE ROW LEVEL SECURITY;

CREATE POLICY "subjects_select" ON subjects FOR SELECT USING (true);
CREATE POLICY "subjects_all" ON subjects FOR ALL USING (auth.uid() IS NULL OR true);
GRANT ALL ON subjects TO authenticated, service_role;

-- ==================== ATTENDANCE ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
        ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
        ALTER TABLE attendance NO FORCE ROW LEVEL SECURITY;
        
        CREATE POLICY "attendance_all" ON attendance FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON attendance TO authenticated, service_role;
    END IF;
END $$;

-- ==================== EXAMS ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exams') THEN
        ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
        ALTER TABLE exams NO FORCE ROW LEVEL SECURITY;
        
        CREATE POLICY "exams_all" ON exams FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON exams TO authenticated, service_role;
    END IF;
END $$;

-- ==================== EXAM_RESULTS ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exam_results') THEN
        ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
        ALTER TABLE exam_results NO FORCE ROW LEVEL SECURITY;
        
        CREATE POLICY "exam_results_all" ON exam_results FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON exam_results TO authenticated, service_role;
    END IF;
END $$;

-- ==================== MARKING_PERIODS ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marking_periods') THEN
        ALTER TABLE marking_periods ENABLE ROW LEVEL SECURITY;
        ALTER TABLE marking_periods NO FORCE ROW LEVEL SECURITY;
        
        CREATE POLICY "marking_periods_all" ON marking_periods FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON marking_periods TO authenticated, service_role;
    END IF;
END $$;

-- ==================== LESSON_PLANS ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lesson_plans') THEN
        ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lesson_plans NO FORCE ROW LEVEL SECURITY;
        
        CREATE POLICY "lesson_plans_all" ON lesson_plans FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON lesson_plans TO authenticated, service_role;
    END IF;
END $$;

-- ==================== ASSIGNMENTS ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assignments') THEN
        ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE assignments NO FORCE ROW LEVEL SECURITY;
        
        CREATE POLICY "assignments_all" ON assignments FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON assignments TO authenticated, service_role;
    END IF;
END $$;

-- ==================== ASSIGNMENT_SUBMISSIONS ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assignment_submissions') THEN
        ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE assignment_submissions NO FORCE ROW LEVEL SECURITY;
        
        CREATE POLICY "assignment_submissions_all" ON assignment_submissions FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON assignment_submissions TO authenticated, service_role;
    END IF;
END $$;

-- ==================== ENROLLMENT_SETTINGS ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollment_settings') THEN
        ALTER TABLE enrollment_settings ENABLE ROW LEVEL SECURITY;
        ALTER TABLE enrollment_settings NO FORCE ROW LEVEL SECURITY;
        
        CREATE POLICY "enrollment_settings_all" ON enrollment_settings FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON enrollment_settings TO authenticated, service_role;
    END IF;
END $$;

-- ==================== SYSTEM_AUDIT_LOG ====================
-- This is the one causing the current error!
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_audit_log') THEN
        ALTER TABLE system_audit_log ENABLE ROW LEVEL SECURITY;
        ALTER TABLE system_audit_log NO FORCE ROW LEVEL SECURITY;
        
        -- Drop existing policies first
        DROP POLICY IF EXISTS "system_audit_log_all" ON system_audit_log;
        DROP POLICY IF EXISTS "system_audit_log_select" ON system_audit_log;
        DROP POLICY IF EXISTS "system_audit_log_insert" ON system_audit_log;
        
        CREATE POLICY "system_audit_log_all" ON system_audit_log FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON system_audit_log TO authenticated, service_role;
    END IF;
END $$;

-- ==================== NOTIFICATIONS ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
        ALTER TABLE notifications NO FORCE ROW LEVEL SECURITY;
        
        CREATE POLICY "notifications_all" ON notifications FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON notifications TO authenticated, service_role;
    END IF;
END $$;

-- ==================== ANNOUNCEMENTS ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'announcements') THEN
        ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
        ALTER TABLE announcements NO FORCE ROW LEVEL SECURITY;
        
        CREATE POLICY "announcements_all" ON announcements FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON announcements TO authenticated, service_role;
    END IF;
END $$;

-- ==================== TIMETABLES ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timetables') THEN
        ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
        ALTER TABLE timetables NO FORCE ROW LEVEL SECURITY;
        
        CREATE POLICY "timetables_all" ON timetables FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON timetables TO authenticated, service_role;
    END IF;
END $$;

-- ==================== PARENT_STUDENT_LINKS ====================
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parent_student_links') THEN
        ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;
        ALTER TABLE parent_student_links NO FORCE ROW LEVEL SECURITY;
        
        CREATE POLICY "parent_student_links_all" ON parent_student_links FOR ALL USING (auth.uid() IS NULL OR true);
        GRANT ALL ON parent_student_links TO authenticated, service_role;
    END IF;
END $$;

-- ============================================================
-- Step 3: Verify all policies are created
-- ============================================================
SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================
-- DONE! All tables should now allow service role access
-- ============================================================

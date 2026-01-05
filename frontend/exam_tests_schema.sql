-- =============================================================
-- EXAM AND TEST MANAGEMENT SCHEMA UPDATES
-- Run this SQL in your Supabase SQL Editor
-- =============================================================

-- 1. Add exam marking periods table
-- This controls when teachers can enter exam marks
CREATE TABLE IF NOT EXISTS exam_marking_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  term VARCHAR(50) NOT NULL, -- 'Term 1', 'Term 2', 'Term 3'
  academic_year VARCHAR(20) NOT NULL, -- '2024', '2025'
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  results_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  published_by UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add columns to exams table for PDF upload and submission tracking
ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_paper_url TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_paper_name TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS marking_period_id UUID REFERENCES exam_marking_periods(id);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES profiles(id); -- The teacher assigned to this exam

-- 3. Add columns to exam_results for comments
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS comment_type VARCHAR(20) DEFAULT 'manual'; -- 'manual', 'auto', 'mixed'

-- 4. Create term tests table (created by teachers)
CREATE TABLE IF NOT EXISTS term_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  test_type VARCHAR(50) DEFAULT 'monthly', -- 'weekly', 'monthly', 'quiz', 'mid-term', 'other'
  test_date DATE NOT NULL,
  total_marks INTEGER NOT NULL,
  test_paper_url TEXT, -- PDF or image URL
  test_paper_name TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create term test results table
CREATE TABLE IF NOT EXISTS term_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES term_tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  marks_obtained DECIMAL(5,2),
  percentage DECIMAL(5,2),
  grade VARCHAR(5),
  comment TEXT,
  comment_type VARCHAR(20) DEFAULT 'manual', -- 'manual', 'auto'
  graded_by UUID REFERENCES profiles(id),
  graded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(test_id, student_id)
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_marking_periods_school ON exam_marking_periods(school_id);
CREATE INDEX IF NOT EXISTS idx_exam_marking_periods_active ON exam_marking_periods(is_active);
CREATE INDEX IF NOT EXISTS idx_term_tests_school ON term_tests(school_id);
CREATE INDEX IF NOT EXISTS idx_term_tests_teacher ON term_tests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_term_tests_class ON term_tests(class_id);
CREATE INDEX IF NOT EXISTS idx_term_test_results_test ON term_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_term_test_results_student ON term_test_results(student_id);

-- 7. Enable RLS
ALTER TABLE exam_marking_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_test_results ENABLE ROW LEVEL SECURITY;

-- 8. Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS "School admins can manage marking periods" ON exam_marking_periods;
DROP POLICY IF EXISTS "Teachers can view marking periods for their school" ON exam_marking_periods;
DROP POLICY IF EXISTS "Teachers can manage their own tests" ON term_tests;
DROP POLICY IF EXISTS "School admins can view all tests" ON term_tests;
DROP POLICY IF EXISTS "Students can view published tests for their class" ON term_tests;
DROP POLICY IF EXISTS "Parents can view published tests for their children's class" ON term_tests;
DROP POLICY IF EXISTS "Teachers can manage test results for their tests" ON term_test_results;
DROP POLICY IF EXISTS "School admins can view all test results" ON term_test_results;
DROP POLICY IF EXISTS "Students can view their own published test results" ON term_test_results;
DROP POLICY IF EXISTS "Parents can view their children's published test results" ON term_test_results;

-- 10. RLS Policies for exam_marking_periods
CREATE POLICY "School admins can manage marking periods"
ON exam_marking_periods FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.school_id = exam_marking_periods.school_id
    AND profiles.role = 'school_admin'
  )
);

CREATE POLICY "Teachers can view marking periods for their school"
ON exam_marking_periods FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.school_id = exam_marking_periods.school_id
    AND profiles.role = 'teacher'
  )
);

-- 12. RLS Policies for term_tests
CREATE POLICY "Teachers can manage their own tests"
ON term_tests FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "School admins can view all tests"
ON term_tests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.school_id = term_tests.school_id
    AND profiles.role = 'school_admin'
  )
);

CREATE POLICY "Students can view published tests for their class"
ON term_tests FOR SELECT
USING (
  is_published = true
  AND EXISTS (
    SELECT 1 FROM students 
    WHERE students.user_id = auth.uid() 
    AND students.class_id = term_tests.class_id
  )
);

CREATE POLICY "Parents can view published tests for their children's class"
ON term_tests FOR SELECT
USING (
  is_published = true
  AND EXISTS (
    SELECT 1 FROM students 
    WHERE students.parent_id = auth.uid() 
    AND students.class_id = term_tests.class_id
  )
);

-- 13. RLS Policies for term_test_results
CREATE POLICY "Teachers can manage test results for their tests"
ON term_test_results FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM term_tests 
    WHERE term_tests.id = term_test_results.test_id 
    AND term_tests.teacher_id = auth.uid()
  )
);

CREATE POLICY "School admins can view all test results"
ON term_test_results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM term_tests 
    JOIN profiles ON profiles.school_id = term_tests.school_id
    WHERE term_tests.id = term_test_results.test_id 
    AND profiles.id = auth.uid()
    AND profiles.role = 'school_admin'
  )
);

CREATE POLICY "Students can view their own published test results"
ON term_test_results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students 
    JOIN term_tests ON term_tests.id = term_test_results.test_id
    WHERE students.user_id = auth.uid() 
    AND students.id = term_test_results.student_id
    AND term_tests.is_published = true
  )
);

CREATE POLICY "Parents can view their children's published test results"
ON term_test_results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM students 
    JOIN term_tests ON term_tests.id = term_test_results.test_id
    WHERE students.parent_id = auth.uid() 
    AND students.id = term_test_results.student_id
    AND term_tests.is_published = true
  )
);

-- Done! Run this SQL in your Supabase SQL Editor


-- Make this script idempotent: drop any existing policies first
DO $$
DECLARE rec RECORD;
BEGIN
  -- Drop all policies on students
  FOR rec IN SELECT policyname FROM pg_policies WHERE tablename = 'students' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON students', rec.policyname);
  END LOOP;

  -- Drop all policies on student_enrollments
  FOR rec IN SELECT policyname FROM pg_policies WHERE tablename = 'student_enrollments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON student_enrollments', rec.policyname);
  END LOOP;

  -- Drop all policies on student_previous_grades
  FOR rec IN SELECT policyname FROM pg_policies WHERE tablename = 'student_previous_grades' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON student_previous_grades', rec.policyname);
  END LOOP;

  -- Drop all policies on schools
  FOR rec IN SELECT policyname FROM pg_policies WHERE tablename = 'schools' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON schools', rec.policyname);
  END LOOP;
END $$;

-- (Policies already dropped by DO block above)

CREATE POLICY "Anyone can view schools" ON schools
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage schools" ON schools
    FOR ALL
    USING (auth.uid() IS NULL OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('super_admin', 'school_admin')
    ));

GRANT ALL ON schools TO authenticated;
GRANT ALL ON schools TO service_role;
GRANT SELECT ON schools TO anon;

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools NO FORCE ROW LEVEL SECURITY;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'students';


-- (Policies already dropped by DO block above)


CREATE POLICY "Users can view students in their school" ON students
    FOR SELECT
    USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Enrollment officers can create students" ON students
    FOR INSERT
    WITH CHECK (
        school_id IN (
            SELECT school_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('enrollment_officer', 'school_admin', 'super_admin')
        )
        OR
        -- Allow service role (when auth.uid() is null, it's service role)
        auth.uid() IS NULL
    );

CREATE POLICY "School admins can update students" ON students
    FOR UPDATE
    USING (
        school_id IN (
            SELECT school_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('school_admin', 'super_admin', 'enrollment_officer')
        )
        OR auth.uid() IS NULL
    );

CREATE POLICY "Super admins can delete students" ON students
    FOR DELETE
    USING (
        school_id IN (
            SELECT school_id FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
        OR auth.uid() IS NULL
    );

GRANT ALL ON students TO authenticated;
GRANT ALL ON students TO service_role;
GRANT ALL ON students TO anon;

-- (Policies already dropped by DO block above)

CREATE POLICY "Users can view enrollments" ON student_enrollments
    FOR SELECT
    USING (
        school_id IN (
            SELECT school_id FROM profiles WHERE id = auth.uid()
        )
        OR auth.uid() IS NULL
    );

CREATE POLICY "Enrollment officers can manage enrollments" ON student_enrollments
    FOR ALL
    USING (
        school_id IN (
            SELECT school_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('enrollment_officer', 'school_admin', 'super_admin')
        )
        OR auth.uid() IS NULL
    );

GRANT ALL ON student_enrollments TO authenticated;
GRANT ALL ON student_enrollments TO service_role;

CREATE TABLE IF NOT EXISTS student_previous_grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES student_enrollments(id) ON DELETE SET NULL,
    subject_name VARCHAR(100) NOT NULL,
    unit_level INTEGER,
    grade VARCHAR(10),
    marks INTEGER,
    exam_type VARCHAR(50) DEFAULT 'previous_school',
    exam_year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- (Policies already dropped by DO block above)

ALTER TABLE student_previous_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view previous grades" ON student_previous_grades
    FOR SELECT
    USING (true);

CREATE POLICY "Enrollment officers can manage previous grades" ON student_previous_grades
    FOR ALL
    USING (auth.uid() IS NULL OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('enrollment_officer', 'school_admin', 'super_admin')
    ));

GRANT ALL ON student_previous_grades TO authenticated;
GRANT ALL ON student_previous_grades TO service_role;

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;

ALTER TABLE students NO FORCE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE student_previous_grades NO FORCE ROW LEVEL SECURITY;

SELECT 'students' as table_name, * FROM pg_policies WHERE tablename = 'students'
UNION ALL
SELECT 'student_enrollments' as table_name, * FROM pg_policies WHERE tablename = 'student_enrollments';

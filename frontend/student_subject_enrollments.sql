-- Student Subject Enrollments Migration
-- This table allows individual students to be enrolled in specific subjects
-- rather than automatically getting all subjects of their class

-- Create the student_subject_enrollments table
CREATE TABLE IF NOT EXISTS student_subject_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_subject_assignment_id UUID NOT NULL REFERENCES class_subject_assignments(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    dropped_at TIMESTAMP WITH TIME ZONE NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'pending')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(student_id, class_subject_assignment_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_subject_enrollments_student_id 
ON student_subject_enrollments(student_id);

CREATE INDEX IF NOT EXISTS idx_student_subject_enrollments_class_subject 
ON student_subject_enrollments(class_subject_assignment_id);

CREATE INDEX IF NOT EXISTS idx_student_subject_enrollments_status 
ON student_subject_enrollments(status);

-- Enable RLS
ALTER TABLE student_subject_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- School admins can manage all enrollments for their school
CREATE POLICY "School admins can manage student subject enrollments"
ON student_subject_enrollments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students s
        JOIN profiles p ON p.school_id = s.school_id
        WHERE s.id = student_subject_enrollments.student_id
        AND p.id = auth.uid()
        AND p.role IN ('school_admin', 'super_admin')
    )
);

-- Teachers can view enrollments for their class-subjects
CREATE POLICY "Teachers can view their class subject enrollments"
ON student_subject_enrollments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM class_subject_assignments csa
        WHERE csa.id = student_subject_enrollments.class_subject_assignment_id
        AND csa.teacher_id = auth.uid()
    )
);

-- Students can view their own enrollments
CREATE POLICY "Students can view their own subject enrollments"
ON student_subject_enrollments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = student_subject_enrollments.student_id
        AND s.user_id = auth.uid()
    )
);

-- Parents can view their children's enrollments
CREATE POLICY "Parents can view children subject enrollments"
ON student_subject_enrollments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = student_subject_enrollments.student_id
        AND s.parent_id = auth.uid()
    )
);

-- Function to auto-enroll a student in all class subjects
CREATE OR REPLACE FUNCTION auto_enroll_student_in_class_subjects(
    p_student_id UUID,
    p_class_id UUID,
    p_created_by UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    enrolled_count INTEGER := 0;
BEGIN
    -- Insert enrollment for each class-subject assignment
    INSERT INTO student_subject_enrollments (
        student_id,
        class_subject_assignment_id,
        status,
        created_by
    )
    SELECT 
        p_student_id,
        csa.id,
        'active',
        p_created_by
    FROM class_subject_assignments csa
    WHERE csa.class_id = p_class_id
    ON CONFLICT (student_id, class_subject_assignment_id) DO NOTHING;
    
    GET DIAGNOSTICS enrolled_count = ROW_COUNT;
    RETURN enrolled_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subjects a student is enrolled in
CREATE OR REPLACE FUNCTION get_student_subjects(p_student_id UUID)
RETURNS TABLE (
    subject_id UUID,
    subject_name TEXT,
    teacher_id UUID,
    teacher_name TEXT,
    class_subject_assignment_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as subject_id,
        s.name as subject_name,
        csa.teacher_id,
        p.full_name as teacher_name,
        csa.id as class_subject_assignment_id
    FROM student_subject_enrollments sse
    JOIN class_subject_assignments csa ON csa.id = sse.class_subject_assignment_id
    JOIN subjects s ON s.id = csa.subject_id
    LEFT JOIN profiles p ON p.id = csa.teacher_id
    WHERE sse.student_id = p_student_id
    AND sse.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table
COMMENT ON TABLE student_subject_enrollments IS 'Tracks which subjects each student is enrolled in. Allows students to have different subject sets than their classmates.';

-- Migration: Auto-enroll existing students in all their class subjects
-- Run this after creating the table to populate existing data
DO $$
DECLARE
    student_record RECORD;
    count_enrolled INTEGER;
BEGIN
    FOR student_record IN 
        SELECT id, class_id FROM students WHERE class_id IS NOT NULL
    LOOP
        SELECT auto_enroll_student_in_class_subjects(
            student_record.id, 
            student_record.class_id,
            NULL
        ) INTO count_enrolled;
    END LOOP;
    
    RAISE NOTICE 'Auto-enrollment migration completed for existing students';
END $$;

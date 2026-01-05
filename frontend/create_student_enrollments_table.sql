-- Create student_enrollments table if it doesn't exist
-- This is the main enrollment tracking table

-- First check if the table exists, if not create it
CREATE TABLE IF NOT EXISTS student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    
    -- Student info
    student_id UUID,
    student_user_id UUID,
    student_full_name TEXT NOT NULL,
    student_gender TEXT,
    student_birth_date DATE,
    student_nationality TEXT,
    student_id_number TEXT,
    student_birth_certificate_number TEXT,
    
    -- Parent info
    parent_id UUID,
    parent_user_id UUID,
    parent_full_name TEXT NOT NULL,
    parent_id_number TEXT,
    parent_phone_number TEXT,
    parent_email TEXT,
    parent_address TEXT,
    parent_relationship TEXT,
    
    -- Class assignment
    class_id UUID REFERENCES classes(id),
    class_name TEXT,
    form_name TEXT,
    entry_status TEXT DEFAULT 'new_primary',
    
    -- Academic info
    academic_year TEXT,
    term TEXT,
    previous_school_name TEXT,
    curriculum TEXT,
    
    -- Credentials (stored temporarily for printing)
    student_username TEXT,
    student_initial_password TEXT,
    parent_username TEXT,
    parent_initial_password TEXT,
    accounts_created BOOLEAN DEFAULT false,
    
    -- Enrollment tracking
    enrollment_status TEXT DEFAULT 'pending',
    enrollment_date DATE DEFAULT CURRENT_DATE,
    enrolled_by UUID REFERENCES profiles(id),
    enrollment_number TEXT,
    
    -- Fee info
    fee_slip_id UUID,
    initial_fee_amount NUMERIC(10,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
DO $$
BEGIN
    -- Add entry_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_enrollments' 
        AND column_name = 'entry_status'
    ) THEN
        ALTER TABLE student_enrollments 
        ADD COLUMN entry_status TEXT DEFAULT 'new_primary';
    END IF;
    
    -- Add form_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_enrollments' 
        AND column_name = 'form_name'
    ) THEN
        ALTER TABLE student_enrollments 
        ADD COLUMN form_name TEXT;
    END IF;
    
    -- Add curriculum column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_enrollments' 
        AND column_name = 'curriculum'
    ) THEN
        ALTER TABLE student_enrollments 
        ADD COLUMN curriculum TEXT;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enrollment officers can view enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Enrollment officers can insert enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "School admins can view all enrollments" ON student_enrollments;

-- Create RLS policies
CREATE POLICY "Enrollment officers can view enrollments"
    ON student_enrollments FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE school_id = student_enrollments.school_id 
            AND role IN ('enrollment_officer', 'school_admin', 'super_admin')
        )
    );

CREATE POLICY "Enrollment officers can insert enrollments"
    ON student_enrollments FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE school_id = student_enrollments.school_id 
            AND role IN ('enrollment_officer', 'school_admin', 'super_admin')
        )
    );

CREATE POLICY "School admins can view all enrollments"
    ON student_enrollments FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE school_id = student_enrollments.school_id 
            AND role IN ('school_admin', 'super_admin')
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_enrollments_school_id ON student_enrollments(school_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_enrollment_date ON student_enrollments(enrollment_date);

-- Verify the table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'student_enrollments'
ORDER BY ordinal_position;

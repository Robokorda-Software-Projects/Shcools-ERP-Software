-- Add entry_status and form_name columns to student_enrollments table
-- Run this migration to add entry status tracking

-- Add columns if they don't exist
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
        
        COMMENT ON COLUMN student_enrollments.entry_status IS 
            'Student entry type: new_primary, new_secondary, form2, form3, form4, a_level';
    END IF;
    
    -- Add form_name column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'student_enrollments' 
        AND column_name = 'form_name'
    ) THEN
        ALTER TABLE student_enrollments 
        ADD COLUMN form_name TEXT;
        
        COMMENT ON COLUMN student_enrollments.form_name IS 
            'The form/grade level the student is enrolling into';
    END IF;
END $$;

-- Create entry status enum type for validation (optional)
DO $$
BEGIN
    CREATE TYPE entry_status_type AS ENUM (
        'new_primary',
        'new_secondary', 
        'form2',
        'form3',
        'form4',
        'a_level',
        'transfer'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'student_enrollments' 
AND column_name IN ('entry_status', 'form_name');

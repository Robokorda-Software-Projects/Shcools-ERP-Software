-- Migration: Add document URL columns to students table
-- This stores URLs for uploaded documents (birth certificate, IDs, reports, fee slips)

-- Add document URL columns to students table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'birth_certificate_url') THEN
        ALTER TABLE students ADD COLUMN birth_certificate_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'student_id_url') THEN
        ALTER TABLE students ADD COLUMN student_id_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'parent_id_url') THEN
        ALTER TABLE students ADD COLUMN parent_id_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'previous_school_report_url') THEN
        ALTER TABLE students ADD COLUMN previous_school_report_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'fee_slip_url') THEN
        ALTER TABLE students ADD COLUMN fee_slip_url TEXT;
    END IF;
END $$;

-- Create storage bucket for student documents if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-documents', 'student-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for student documents
DO $$ 
BEGIN
    -- Allow authenticated users to upload
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow authenticated uploads to student-documents'
    ) THEN
        CREATE POLICY "Allow authenticated uploads to student-documents"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'student-documents');
    END IF;

    -- Allow users to view their own documents or school staff to view all
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow viewing student-documents'
    ) THEN
        CREATE POLICY "Allow viewing student-documents"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = 'student-documents');
    END IF;

    -- Allow deletion by school staff
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow deletion of student-documents'
    ) THEN
        CREATE POLICY "Allow deletion of student-documents"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'student-documents');
    END IF;
END $$;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students(parent_id);

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 07_add_document_urls_to_students completed successfully';
END $$;

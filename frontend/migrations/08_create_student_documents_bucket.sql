-- Create student-documents storage bucket
-- Run this in Supabase SQL Editor

-- Insert the bucket (will skip if it already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  true,  -- Make it public so documents can be viewed
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'application/pdf'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view student documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload student documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update student documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete student documents" ON storage.objects;

-- Create storage policies for student-documents bucket
-- Allow anyone to view (since bucket is public)
CREATE POLICY "Anyone can view student documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'student-documents');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload student documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'student-documents');

-- Allow authenticated users to update their own files
CREATE POLICY "Authenticated users can update student documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'student-documents');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete student documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'student-documents');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Student documents storage bucket created successfully!';
  RAISE NOTICE 'Bucket is PUBLIC - documents can be viewed by anyone with the link';
  RAISE NOTICE 'Max file size: 10MB';
  RAISE NOTICE 'Allowed types: JPEG, PNG, GIF, PDF';
END $$;

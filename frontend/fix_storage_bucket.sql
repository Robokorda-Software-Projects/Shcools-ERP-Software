-- Fix: Create school-assets storage bucket for stamps and signatures
-- Run this in Supabase SQL Editor

-- Create storage bucket for school assets if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload school assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view school assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update school assets" ON storage.objects;

-- Storage policies for school-assets bucket
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload school assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'school-assets');

-- Allow public read access
CREATE POLICY "Public can view school assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'school-assets');

-- Allow users to update their own uploads
CREATE POLICY "Users can update school assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'school-assets');

-- Done! Now you can upload stamps and signatures from School Admin > Settings

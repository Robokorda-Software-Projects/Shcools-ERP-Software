-- Add signature and stamp fields to schools table for E-Report cards
-- Run this in Supabase SQL Editor

-- Add columns for official signatures and stamps
ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_stamp_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS principal_signature_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS admin_signature_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enrollment_officer_signature_url TEXT;

-- Add column for grading scale description
ALTER TABLE schools ADD COLUMN IF NOT EXISTS grading_scale JSONB DEFAULT '[
  {"grade": "A", "min": 75, "max": 100, "description": "Excellent"},
  {"grade": "B", "min": 65, "max": 74, "description": "Very Good"},
  {"grade": "C", "min": 50, "max": 64, "description": "Good"},
  {"grade": "D", "min": 40, "max": 49, "description": "Satisfactory"},
  {"grade": "E", "min": 0, "max": 39, "description": "Needs Improvement"}
]'::jsonb;

-- Add report card settings
ALTER TABLE schools ADD COLUMN IF NOT EXISTS report_card_settings JSONB DEFAULT '{
  "showClassPosition": true,
  "showOverallPosition": false,
  "showTeacherComments": true,
  "showPrincipalComments": true,
  "showAttendanceSummary": true,
  "showConductGrade": true
}'::jsonb;

-- Create storage bucket for school assets if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies first to avoid conflicts
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

-- Comment on the new columns
COMMENT ON COLUMN schools.school_stamp_url IS 'URL to the official school stamp image for report cards';
COMMENT ON COLUMN schools.principal_signature_url IS 'URL to the principal signature image for report cards';
COMMENT ON COLUMN schools.admin_signature_url IS 'URL to the school admin signature image';
COMMENT ON COLUMN schools.enrollment_officer_signature_url IS 'URL to enrollment officer signature image';
COMMENT ON COLUMN schools.grading_scale IS 'JSON array defining the grading scale used by the school';
COMMENT ON COLUMN schools.report_card_settings IS 'JSON object with report card display settings';

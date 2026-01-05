-- Add website column to schools table
-- Run this migration in Supabase SQL Editor

ALTER TABLE schools
ADD COLUMN IF NOT EXISTS website character varying(255);

-- Comment on the column
COMMENT ON COLUMN schools.website IS 'School website URL';

-- Example update (optional - run after adding your school's website)
-- UPDATE schools SET website = 'https://www.yourschool.co.zw' WHERE school_code = 'YOUR_SCHOOL_CODE';

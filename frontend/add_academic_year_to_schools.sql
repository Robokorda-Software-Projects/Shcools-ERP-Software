-- Add academic_year column to schools table if it doesn't exist
-- This fixes the "column schools.academic_year does not exist" error

DO $$
BEGIN
    -- Add academic_year column to schools table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'schools' 
        AND column_name = 'academic_year'
    ) THEN
        ALTER TABLE schools 
        ADD COLUMN academic_year TEXT DEFAULT '2025';
        
        COMMENT ON COLUMN schools.academic_year IS 'Current academic year for the school';
    END IF;
END $$;

-- Update existing schools to current year
UPDATE schools 
SET academic_year = '2025' 
WHERE academic_year IS NULL;

-- Verify the change
SELECT id, name, academic_year 
FROM schools 
LIMIT 5;

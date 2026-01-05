-- STEP 1: Add missing columns to schools table
-- Run this FIRST
-- =====================================================

ALTER TABLE schools ADD COLUMN IF NOT EXISTS current_term VARCHAR(50);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS academic_year VARCHAR(10);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- Done! Now run 02_create_fee_tables.sql

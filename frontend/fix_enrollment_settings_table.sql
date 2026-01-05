-- Fix enrollment_settings table - add all missing columns
-- Run this migration to fix the "column not found" errors

-- Drop and recreate the enrollment_settings table with all required columns
DROP TABLE IF EXISTS enrollment_settings CASCADE;

CREATE TABLE enrollment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    -- Class Assignment Settings
    class_assignment_method TEXT DEFAULT 'auto_grade_based',
    allow_manual_override BOOLEAN DEFAULT true,
    use_grade_based_placement BOOLEAN DEFAULT true,
    use_ai_placement BOOLEAN DEFAULT false,
    
    -- Required Documents
    require_birth_certificate BOOLEAN DEFAULT true,
    require_parent_id BOOLEAN DEFAULT true,
    require_student_id BOOLEAN DEFAULT false,
    require_fee_slip BOOLEAN DEFAULT true,
    require_previous_school_report BOOLEAN DEFAULT false,
    
    -- Account Creation Settings
    username_format TEXT DEFAULT 'surname_birthyear',
    password_format TEXT DEFAULT 'id_number',
    
    -- Fee Settings
    minimum_fee_percentage NUMERIC(5,2) DEFAULT 0,
    allow_enrollment_without_payment BOOLEAN DEFAULT false,
    
    -- Notification Settings
    notify_parent_on_enrollment BOOLEAN DEFAULT true,
    notify_admin_on_enrollment BOOLEAN DEFAULT true,
    send_welcome_email BOOLEAN DEFAULT true,
    
    -- Bulk Upload Settings
    allow_bulk_upload BOOLEAN DEFAULT true,
    bulk_upload_skip_fee_slip BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one settings record per school
    UNIQUE(school_id)
);

-- Add RLS policies
ALTER TABLE enrollment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School admins can view their school settings" ON enrollment_settings;
CREATE POLICY "School admins can view their school settings"
    ON enrollment_settings FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE school_id = enrollment_settings.school_id 
            AND role IN ('school_admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "School admins can update their school settings" ON enrollment_settings;
CREATE POLICY "School admins can update their school settings"
    ON enrollment_settings FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE school_id = enrollment_settings.school_id 
            AND role IN ('school_admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "School admins can insert their school settings" ON enrollment_settings;
CREATE POLICY "School admins can insert their school settings"
    ON enrollment_settings FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE school_id = enrollment_settings.school_id 
            AND role IN ('school_admin', 'super_admin')
        )
    );

-- Add comment
COMMENT ON TABLE enrollment_settings IS 'School-specific enrollment configuration and rules';

-- Verify the table structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'enrollment_settings'
ORDER BY ordinal_position;

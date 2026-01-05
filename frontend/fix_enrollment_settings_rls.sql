-- Fix enrollment_settings table and RLS policies
-- Run this in Supabase SQL Editor

-- First, check if table exists and create if not
CREATE TABLE IF NOT EXISTS public.enrollment_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    
    -- Class Assignment
    class_assignment_method VARCHAR(50) DEFAULT 'auto_grade_based',
    allow_manual_override BOOLEAN DEFAULT true,
    use_grade_based_placement BOOLEAN DEFAULT true,
    use_ai_placement BOOLEAN DEFAULT false,
    
    -- Required Documents
    require_birth_certificate BOOLEAN DEFAULT true,
    require_parent_id BOOLEAN DEFAULT true,
    require_student_id BOOLEAN DEFAULT false,
    require_fee_slip BOOLEAN DEFAULT true,
    require_previous_school_report BOOLEAN DEFAULT false,
    
    -- Credential Format
    username_format VARCHAR(50) DEFAULT 'surname_birthyear',
    password_format VARCHAR(50) DEFAULT 'id_number',
    
    -- Fee Settings
    minimum_fee_percentage INTEGER DEFAULT 0,
    allow_enrollment_without_payment BOOLEAN DEFAULT false,
    
    -- Notifications
    notify_parent_on_enrollment BOOLEAN DEFAULT true,
    notify_admin_on_enrollment BOOLEAN DEFAULT true,
    send_welcome_email BOOLEAN DEFAULT true,
    
    -- Bulk Upload
    allow_bulk_upload BOOLEAN DEFAULT true,
    bulk_upload_skip_fee_slip BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one settings record per school
    UNIQUE(school_id)
);

-- Enable RLS
ALTER TABLE public.enrollment_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their school enrollment settings" ON public.enrollment_settings;
DROP POLICY IF EXISTS "Admins can insert enrollment settings" ON public.enrollment_settings;
DROP POLICY IF EXISTS "Admins can update their school enrollment settings" ON public.enrollment_settings;
DROP POLICY IF EXISTS "Admins can delete their school enrollment settings" ON public.enrollment_settings;

-- Create RLS policies

-- SELECT: Users can view their school's settings
CREATE POLICY "Users can view their school enrollment settings" ON public.enrollment_settings
    FOR SELECT
    USING (
        school_id IN (
            SELECT school_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- INSERT: School admins and super admins can insert
CREATE POLICY "Admins can insert enrollment settings" ON public.enrollment_settings
    FOR INSERT
    WITH CHECK (
        school_id IN (
            SELECT school_id FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('school_admin', 'super_admin')
        )
    );

-- UPDATE: School admins and super admins can update their school's settings
CREATE POLICY "Admins can update their school enrollment settings" ON public.enrollment_settings
    FOR UPDATE
    USING (
        school_id IN (
            SELECT school_id FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('school_admin', 'super_admin')
        )
    );

-- DELETE: School admins and super admins can delete
CREATE POLICY "Admins can delete their school enrollment settings" ON public.enrollment_settings
    FOR DELETE
    USING (
        school_id IN (
            SELECT school_id FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('school_admin', 'super_admin')
        )
    );

-- Grant permissions
GRANT ALL ON public.enrollment_settings TO authenticated;
GRANT SELECT ON public.enrollment_settings TO anon;

-- Verify table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'enrollment_settings' 
ORDER BY ordinal_position;

-- Check existing data
SELECT * FROM public.enrollment_settings;

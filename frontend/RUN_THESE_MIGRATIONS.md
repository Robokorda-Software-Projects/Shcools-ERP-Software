# SQL Migrations to Run (in order)

Run these SQL migrations in your Supabase SQL Editor to fix all the database schema issues.

## 0. Create student_enrollments table (RUN THIS FIRST!)
**File:** `create_student_enrollments_table.sql`
**Purpose:** Creates the main enrollment tracking table if it doesn't exist

```sql
-- Run the full file: create_student_enrollments_table.sql
-- This creates the student_enrollments table with all required columns
```

## 1. Add academic_year to schools table
**File:** `add_academic_year_to_schools.sql`
**Purpose:** Fixes "column schools.academic_year does not exist" error

```sql
-- Add academic_year column to schools table if it doesn't exist
DO $$
BEGIN
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
```

## 2. Fix enrollment_settings table with all columns
**File:** `fix_enrollment_settings_table.sql`
**Purpose:** Adds all missing columns to enrollment_settings table

```sql
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
```

## 3. Add entry_status and form_name to student_enrollments
**File:** `add_entry_status_column.sql`
**Purpose:** Adds entry status tracking for students

```sql
-- Add entry_status and form_name columns to student_enrollments table
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
            'Student entry type: new_primary, transfer_primary, grade7_to_form1, transfer_secondary, olevel_to_alevel';
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
```

## 4. Verify schema changes
**File:** `view_schema.sql`
**Purpose:** View the current database schema to verify all changes

```sql
-- View all columns for enrollment_settings table
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'enrollment_settings'
ORDER BY ordinal_position;

-- View all columns for schools table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'schools'
ORDER BY ordinal_position;

-- View all columns for student_enrollments table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'student_enrollments'
ORDER BY ordinal_position;
```

## After Running Migrations

1. **Refresh your browser** to clear any cached API responses
2. **Test enrollment settings page** - navigate to `/dashboard/enrollment-settings`
3. **Test enrollment page** - navigate to `/dashboard/students/enroll-new`
4. **Verify entry status** options are filtered by school type (primary/secondary/combined)
5. **Test ZIMSEC grading** with units 1-9 for Grade 7 students
6. **Verify nationality dropdown** shows African countries
7. **Verify occupation dropdown** shows African job types

## Changes Summary

### Enrollment Page Updates:
- ✅ Entry status filtered by school type (primary shows only Grade 1-7 options, secondary shows Form 1-6)
- ✅ African countries added to nationality dropdown (Zimbabwe, South Africa, Zambia, Botswana, Malawi, Mozambique, DRC, Lesotho, Eswatini)
- ✅ African occupations dropdown for parent occupation
- ✅ Curriculum field made compulsory (ZIMSEC, Cambridge, IB, South African, Local)
- ✅ ZIMSEC Grade 7: Units only (1-9, where 1=best) with auto-calculate total units and percentage
- ✅ Other grades: Percentage input with auto-generated grade (80+=A, 70+=B, 60+=C, 50+=D, 40+=E, <40=F)
- ✅ Fixed API error handling to show proper error messages instead of HTML

### New Features:
- ✅ Enrollment Settings page for admins (`/dashboard/enrollment-settings`)
- ✅ Class assignment rules (grade-based, random, capacity-based, manual)
- ✅ Required documents configuration
- ✅ Fee payment rules
- ✅ Notification settings

### Database Schema:
- ✅ `schools.academic_year` column added
- ✅ `enrollment_settings` table recreated with all 20+ columns
- ✅ `student_enrollments.entry_status` and `form_name` columns added

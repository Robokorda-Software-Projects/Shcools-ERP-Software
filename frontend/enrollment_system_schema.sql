-- SmartSchools Enrollment System Schema
-- =====================================================
-- This schema supports:
-- 1. Student enrollment with parent account auto-creation
-- 2. Fee slip upload and verification
-- 3. Class assignment criteria/algorithms
-- 4. Bulk CSV upload tracking
-- 5. Enrollment records and history
-- =====================================================

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Users can view their own enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Enrollment officers can manage enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Users can view fee slips" ON fee_slips;
DROP POLICY IF EXISTS "Enrollment officers can manage fee slips" ON fee_slips;
DROP POLICY IF EXISTS "Users can view enrollment settings" ON enrollment_settings;
DROP POLICY IF EXISTS "Admins can manage enrollment settings" ON enrollment_settings;
DROP POLICY IF EXISTS "Users can view class criteria" ON class_assignment_criteria;
DROP POLICY IF EXISTS "Admins can manage class criteria" ON class_assignment_criteria;
DROP POLICY IF EXISTS "Users can view bulk uploads" ON bulk_enrollment_uploads;
DROP POLICY IF EXISTS "Enrollment officers can manage bulk uploads" ON bulk_enrollment_uploads;
DROP POLICY IF EXISTS "Users can view previous grades" ON student_previous_grades;
DROP POLICY IF EXISTS "Enrollment officers can manage previous grades" ON student_previous_grades;

-- =====================================================
-- 1. ENROLLMENT SETTINGS TABLE
-- Stores school-specific enrollment configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS enrollment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    -- Class Assignment Criteria
    class_assignment_method VARCHAR(50) DEFAULT 'officer_decision', -- officer_decision, student_choice, grade_based, ai_algorithm
    allow_student_class_choice BOOLEAN DEFAULT false,
    use_grade_based_placement BOOLEAN DEFAULT false,
    use_ai_placement BOOLEAN DEFAULT false,
    
    -- Required Documents
    require_birth_certificate BOOLEAN DEFAULT true,
    require_parent_id BOOLEAN DEFAULT true,
    require_student_id BOOLEAN DEFAULT false,
    require_fee_slip BOOLEAN DEFAULT true,
    require_previous_school_report BOOLEAN DEFAULT false,
    
    -- Username/Password Format
    username_format VARCHAR(50) DEFAULT 'surname_birthyear', -- surname_birthyear, email, custom
    password_format VARCHAR(50) DEFAULT 'id_number', -- id_number, random, custom
    
    -- Fee Settings
    minimum_fee_percentage DECIMAL(5,2) DEFAULT 0, -- Minimum % required to enroll (0 = any payment accepted)
    allow_enrollment_without_payment BOOLEAN DEFAULT false,
    
    -- Notifications
    notify_parent_on_enrollment BOOLEAN DEFAULT true,
    notify_admin_on_enrollment BOOLEAN DEFAULT true,
    send_welcome_sms BOOLEAN DEFAULT false,
    send_welcome_email BOOLEAN DEFAULT true,
    
    -- Bulk Upload Settings
    allow_bulk_upload BOOLEAN DEFAULT true,
    bulk_upload_skip_fee_slip BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(school_id)
);

-- =====================================================
-- 2. CLASS ASSIGNMENT CRITERIA TABLE
-- Defines how classes are ranked (best to last)
-- =====================================================
CREATE TABLE IF NOT EXISTS class_assignment_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    
    -- Class ranking (1 = best class, higher = lower performing)
    class_rank INTEGER NOT NULL DEFAULT 1,
    
    -- Grade thresholds for automatic placement
    minimum_average_percentage DECIMAL(5,2), -- Minimum average % to qualify for this class
    maximum_average_percentage DECIMAL(5,2), -- Maximum average % (optional, for range)
    
    -- Capacity settings
    priority_capacity INTEGER, -- Reserved spots for high performers
    
    -- Subject weightings for AI algorithm (JSON: {"maths": 1.5, "english": 1.2, ...})
    subject_weightings JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(school_id, class_id)
);

-- =====================================================
-- 3. STUDENT PREVIOUS GRADES TABLE
-- Stores grades from previous school for placement
-- =====================================================
CREATE TABLE IF NOT EXISTS student_previous_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES student_enrollments(id) ON DELETE SET NULL,
    
    -- Subject and marks
    subject_name VARCHAR(100) NOT NULL,
    marks_obtained DECIMAL(5,2),
    total_marks DECIMAL(5,2) DEFAULT 100,
    percentage DECIMAL(5,2),
    grade VARCHAR(10), -- A, B, C, D, E, U or 1-9 units
    
    -- Zimbabwe ZIMSEC specific
    unit_level INTEGER, -- 1-9 for Zimbabwe O-Level
    
    exam_type VARCHAR(50), -- 'grade7', 'o_level', 'internal', etc.
    exam_year INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 4. FEE SLIPS TABLE
-- Stores uploaded fee payment slips
-- =====================================================
CREATE TABLE IF NOT EXISTS fee_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    enrollment_id UUID REFERENCES student_enrollments(id) ON DELETE SET NULL,
    
    -- Slip details
    slip_number VARCHAR(100),
    slip_image_url TEXT NOT NULL,
    qr_code_data TEXT, -- Decoded QR code data for verification
    
    -- Payment details
    amount_paid DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_date DATE,
    payment_method VARCHAR(50), -- cash, ecocash, bank_transfer, etc.
    
    -- Term/Year
    academic_year VARCHAR(20),
    term VARCHAR(20), -- Term 1, Term 2, Term 3
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMP,
    verification_notes TEXT,
    
    -- For bulk uploads
    is_bulk_upload BOOLEAN DEFAULT false,
    bulk_upload_id UUID REFERENCES bulk_enrollment_uploads(id),
    
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 5. STUDENT ENROLLMENTS TABLE
-- Main enrollment record with all details
-- =====================================================
CREATE TABLE IF NOT EXISTS student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    -- Student Info
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    student_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    student_full_name VARCHAR(255) NOT NULL,
    student_gender VARCHAR(20),
    student_birth_date DATE,
    student_nationality VARCHAR(100) DEFAULT 'Zimbabwean',
    student_id_number VARCHAR(50), -- National ID or birth cert number
    student_birth_certificate_number VARCHAR(100),
    
    -- Parent/Guardian Info
    parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    parent_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    parent_full_name VARCHAR(255) NOT NULL,
    parent_id_number VARCHAR(50) NOT NULL, -- Parent's national ID
    parent_phone_number VARCHAR(50),
    parent_email VARCHAR(255),
    parent_address TEXT,
    parent_relationship VARCHAR(50) DEFAULT 'parent', -- parent, guardian, uncle, aunt, etc.
    
    -- Academic Placement
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    class_name VARCHAR(100),
    academic_year VARCHAR(20),
    term VARCHAR(20),
    
    -- Class assignment details
    assignment_method VARCHAR(50), -- how class was assigned
    assignment_notes TEXT,
    
    -- Previous School
    previous_school_name VARCHAR(255),
    previous_school_address TEXT,
    transfer_reason TEXT,
    
    -- Documents
    birth_certificate_uploaded BOOLEAN DEFAULT false,
    parent_id_uploaded BOOLEAN DEFAULT false,
    student_id_uploaded BOOLEAN DEFAULT false,
    previous_report_uploaded BOOLEAN DEFAULT false,
    
    -- Fee Payment
    fee_slip_id UUID REFERENCES fee_slips(id),
    initial_fee_amount DECIMAL(12,2),
    fee_status VARCHAR(50) DEFAULT 'pending', -- pending, partial, paid, waived
    
    -- Account Creation
    student_username VARCHAR(100),
    student_initial_password VARCHAR(255), -- Stored temporarily, should be hashed
    parent_username VARCHAR(100),
    parent_initial_password VARCHAR(255),
    accounts_created BOOLEAN DEFAULT false,
    
    -- Enrollment Status
    enrollment_status VARCHAR(50) DEFAULT 'pending', -- pending, completed, cancelled, rejected
    enrollment_date DATE DEFAULT CURRENT_DATE,
    
    -- Enrollment Officer
    enrolled_by UUID REFERENCES profiles(id),
    enrollment_notes TEXT,
    
    -- Printing
    enrollment_form_printed BOOLEAN DEFAULT false,
    credentials_form_printed BOOLEAN DEFAULT false,
    
    -- Bulk upload tracking
    is_bulk_upload BOOLEAN DEFAULT false,
    bulk_upload_id UUID REFERENCES bulk_enrollment_uploads(id),
    bulk_upload_row_number INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 6. BULK ENROLLMENT UPLOADS TABLE
-- Tracks CSV/Excel bulk uploads
-- =====================================================
CREATE TABLE IF NOT EXISTS bulk_enrollment_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    -- File info
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    
    -- Upload stats
    total_rows INTEGER DEFAULT 0,
    successful_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    
    -- Error tracking
    errors JSONB DEFAULT '[]', -- Array of {row: number, error: string}
    
    -- Status
    upload_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    
    -- Audit
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 7. FEE BALANCE/ARREARS TABLE
-- Tracks student fee balances and arrears
-- =====================================================
CREATE TABLE IF NOT EXISTS student_fee_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    academic_year VARCHAR(20) NOT NULL,
    term VARCHAR(20) NOT NULL,
    
    -- Fee structure
    total_fees_due DECIMAL(12,2) NOT NULL,
    total_paid DECIMAL(12,2) DEFAULT 0,
    outstanding_balance DECIMAL(12,2) GENERATED ALWAYS AS (total_fees_due - total_paid) STORED,
    
    -- Status
    fee_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, partial, paid, overdue, waived
    
    -- Notifications
    last_reminder_sent TIMESTAMP,
    reminder_count INTEGER DEFAULT 0,
    
    -- Dates
    due_date DATE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(school_id, student_id, academic_year, term)
);

-- =====================================================
-- 8. FEE REMINDER NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS fee_reminder_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES profiles(id),
    fee_balance_id UUID REFERENCES student_fee_balances(id),
    
    -- Notification details
    notification_type VARCHAR(50) NOT NULL, -- email, sms, in_app
    subject VARCHAR(255),
    message TEXT NOT NULL,
    outstanding_amount DECIMAL(12,2),
    
    -- Status
    sent_at TIMESTAMP DEFAULT NOW(),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ADD NEW COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add columns to classes table for ranking
ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_rank INTEGER DEFAULT 1;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_streaming_enabled BOOLEAN DEFAULT false;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 40;

-- Add columns to profiles for parent-specific info
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS relationship_to_student VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employer VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_phone VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alt_phone VARCHAR(50);

-- Add columns to students for enhanced info
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES student_enrollments(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS fee_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE students ADD COLUMN IF NOT EXISTS has_arrears BOOLEAN DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS initial_password VARCHAR(255);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_assignment_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_enrollment_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_previous_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fee_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_reminder_notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE RLS POLICIES
-- =====================================================

-- Student Enrollments
CREATE POLICY "Users can view their own enrollments" ON student_enrollments
    FOR SELECT USING (
        auth.uid() = student_user_id OR
        auth.uid() = parent_user_id OR
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND (p.role IN ('super_admin', 'school_admin', 'enrollment_officer') 
                 AND (p.school_id = student_enrollments.school_id OR p.role = 'super_admin'))
        )
    );

CREATE POLICY "Enrollment officers can manage enrollments" ON student_enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND (p.role IN ('super_admin', 'school_admin', 'enrollment_officer') 
                 AND (p.school_id = student_enrollments.school_id OR p.role = 'super_admin'))
        )
    );

-- Fee Slips
CREATE POLICY "Users can view fee slips" ON fee_slips
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND (p.role IN ('super_admin', 'school_admin', 'enrollment_officer', 'teacher', 'accountant') 
                 AND (p.school_id = fee_slips.school_id OR p.role = 'super_admin'))
        ) OR
        EXISTS (
            SELECT 1 FROM students s 
            WHERE s.id = fee_slips.student_id 
            AND (s.user_id = auth.uid() OR s.parent_id = auth.uid())
        )
    );

CREATE POLICY "Enrollment officers can manage fee slips" ON fee_slips
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('super_admin', 'school_admin', 'enrollment_officer', 'accountant') 
            AND (p.school_id = fee_slips.school_id OR p.role = 'super_admin')
        )
    );

-- Enrollment Settings
CREATE POLICY "Users can view enrollment settings" ON enrollment_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND (p.school_id = enrollment_settings.school_id OR p.role = 'super_admin')
        )
    );

CREATE POLICY "Admins can manage enrollment settings" ON enrollment_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('super_admin', 'school_admin') 
            AND (p.school_id = enrollment_settings.school_id OR p.role = 'super_admin')
        )
    );

-- Class Assignment Criteria
CREATE POLICY "Users can view class criteria" ON class_assignment_criteria
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND (p.school_id = class_assignment_criteria.school_id OR p.role = 'super_admin')
        )
    );

CREATE POLICY "Admins can manage class criteria" ON class_assignment_criteria
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('super_admin', 'school_admin') 
            AND (p.school_id = class_assignment_criteria.school_id OR p.role = 'super_admin')
        )
    );

-- Bulk Uploads
CREATE POLICY "Users can view bulk uploads" ON bulk_enrollment_uploads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('super_admin', 'school_admin', 'enrollment_officer') 
            AND (p.school_id = bulk_enrollment_uploads.school_id OR p.role = 'super_admin')
        )
    );

CREATE POLICY "Enrollment officers can manage bulk uploads" ON bulk_enrollment_uploads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('super_admin', 'school_admin', 'enrollment_officer') 
            AND (p.school_id = bulk_enrollment_uploads.school_id OR p.role = 'super_admin')
        )
    );

-- Previous Grades
CREATE POLICY "Users can view previous grades" ON student_previous_grades
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students s 
            WHERE s.id = student_previous_grades.student_id 
            AND (s.user_id = auth.uid() OR s.parent_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('super_admin', 'school_admin', 'enrollment_officer', 'teacher')
        )
    );

CREATE POLICY "Enrollment officers can manage previous grades" ON student_previous_grades
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('super_admin', 'school_admin', 'enrollment_officer')
        )
    );

-- Fee Balances
ALTER TABLE student_fee_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fee balances" ON student_fee_balances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM students s 
            WHERE s.id = student_fee_balances.student_id 
            AND (s.user_id = auth.uid() OR s.parent_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('super_admin', 'school_admin', 'enrollment_officer', 'teacher', 'accountant') 
            AND (p.school_id = student_fee_balances.school_id OR p.role = 'super_admin')
        )
    );

CREATE POLICY "Admins can manage fee balances" ON student_fee_balances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('super_admin', 'school_admin', 'accountant') 
            AND (p.school_id = student_fee_balances.school_id OR p.role = 'super_admin')
        )
    );

-- Fee Reminder Notifications
ALTER TABLE fee_reminder_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their reminders" ON fee_reminder_notifications
    FOR SELECT USING (
        parent_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM students s 
            WHERE s.id = fee_reminder_notifications.student_id 
            AND s.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('super_admin', 'school_admin', 'accountant') 
            AND (p.school_id = fee_reminder_notifications.school_id OR p.role = 'super_admin')
        )
    );

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_enrollments_school ON student_enrollments(school_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_parent ON student_enrollments(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON student_enrollments(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_enrollments_date ON student_enrollments(enrollment_date);

CREATE INDEX IF NOT EXISTS idx_fee_slips_school ON fee_slips(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_slips_student ON fee_slips(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_slips_verified ON fee_slips(is_verified);

CREATE INDEX IF NOT EXISTS idx_fee_balances_school ON student_fee_balances(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_balances_student ON student_fee_balances(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_balances_status ON student_fee_balances(fee_status);

CREATE INDEX IF NOT EXISTS idx_previous_grades_student ON student_previous_grades(student_id);

-- =====================================================
-- CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to generate username from surname and birth year
CREATE OR REPLACE FUNCTION generate_username(
    full_name VARCHAR,
    birth_date DATE,
    role_type VARCHAR DEFAULT 'student'
) RETURNS VARCHAR AS $$
DECLARE
    surname VARCHAR;
    birth_year VARCHAR;
    base_username VARCHAR;
    final_username VARCHAR;
    counter INTEGER := 0;
BEGIN
    -- Extract surname (last word in name)
    surname := LOWER(TRIM(SPLIT_PART(full_name, ' ', 
        ARRAY_LENGTH(STRING_TO_ARRAY(full_name, ' '), 1))));
    
    -- Extract birth year
    birth_year := EXTRACT(YEAR FROM birth_date)::VARCHAR;
    
    -- Create base username
    base_username := surname || birth_year;
    final_username := base_username;
    
    -- Check for duplicates and add number if needed
    WHILE EXISTS (SELECT 1 FROM profiles WHERE LOWER(username) = final_username) LOOP
        counter := counter + 1;
        final_username := base_username || counter::VARCHAR;
    END LOOP;
    
    RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Function to normalize ID number (remove dashes and lowercase)
CREATE OR REPLACE FUNCTION normalize_id_number(id_number VARCHAR) RETURNS VARCHAR AS $$
BEGIN
    RETURN LOWER(REPLACE(REPLACE(REPLACE(id_number, '-', ''), ' ', ''), '/', ''));
END;
$$ LANGUAGE plpgsql;

-- Function to calculate class placement based on grades
CREATE OR REPLACE FUNCTION calculate_class_placement(
    p_school_id UUID,
    p_grade_level VARCHAR,
    p_average_percentage DECIMAL
) RETURNS UUID AS $$
DECLARE
    recommended_class_id UUID;
BEGIN
    -- Find the appropriate class based on average percentage and class criteria
    SELECT c.id INTO recommended_class_id
    FROM classes c
    LEFT JOIN class_assignment_criteria cac ON c.id = cac.class_id
    WHERE c.school_id = p_school_id
    AND c.grade_level = p_grade_level
    AND (
        cac.minimum_average_percentage IS NULL 
        OR p_average_percentage >= cac.minimum_average_percentage
    )
    AND (
        cac.maximum_average_percentage IS NULL 
        OR p_average_percentage <= cac.maximum_average_percentage
    )
    ORDER BY COALESCE(c.class_rank, cac.class_rank, 999) ASC
    LIMIT 1;
    
    -- If no specific criteria match, return the first available class
    IF recommended_class_id IS NULL THEN
        SELECT id INTO recommended_class_id
        FROM classes
        WHERE school_id = p_school_id
        AND grade_level = p_grade_level
        ORDER BY class_rank ASC NULLS LAST
        LIMIT 1;
    END IF;
    
    RETURN recommended_class_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE STORAGE BUCKET FOR FEE SLIPS
-- =====================================================
-- Run this in Supabase Dashboard > Storage
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('fee-slips', 'fee-slips', false);

-- Storage policies would be:
-- CREATE POLICY "Authenticated users can upload fee slips"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'fee-slips' AND auth.role() = 'authenticated');

-- CREATE POLICY "Users can view fee slips"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'fee-slips' AND auth.role() = 'authenticated');

COMMENT ON TABLE student_enrollments IS 'Main enrollment records with student and parent info';
COMMENT ON TABLE fee_slips IS 'Uploaded fee payment slips with QR verification';
COMMENT ON TABLE enrollment_settings IS 'School-specific enrollment configuration';
COMMENT ON TABLE class_assignment_criteria IS 'Criteria for automatic class placement';
COMMENT ON TABLE bulk_enrollment_uploads IS 'Tracking for CSV/Excel bulk uploads';
COMMENT ON TABLE student_previous_grades IS 'Previous school grades for placement';
COMMENT ON TABLE student_fee_balances IS 'Student fee balances and arrears tracking';

-- STEP 3: Enable RLS and create policies
-- Run this THIRD (after 02_create_fee_tables.sql)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_fees
DROP POLICY IF EXISTS "School staff can view fees" ON student_fees;
CREATE POLICY "School staff can view fees" ON student_fees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.school_id = student_fees.school_id
            AND profiles.role IN ('school_admin', 'enrollment_officer', 'teacher')
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Enrollment officers and admins can manage fees" ON student_fees;
CREATE POLICY "Enrollment officers and admins can manage fees" ON student_fees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.school_id = student_fees.school_id
            AND profiles.role IN ('school_admin', 'enrollment_officer')
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

-- RLS Policies for fee_payments
DROP POLICY IF EXISTS "School staff can view payments" ON fee_payments;
CREATE POLICY "School staff can view payments" ON fee_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.school_id = fee_payments.school_id
            AND profiles.role IN ('school_admin', 'enrollment_officer', 'teacher')
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Enrollment officers and admins can manage payments" ON fee_payments;
CREATE POLICY "Enrollment officers and admins can manage payments" ON fee_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.school_id = fee_payments.school_id
            AND profiles.role IN ('school_admin', 'enrollment_officer')
        )
        OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

-- Done! Now run 04_fee_trigger.sql

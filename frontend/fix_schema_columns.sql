-- SQL Migration Script for Schools ERP
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Add missing columns to schools table
ALTER TABLE schools ADD COLUMN IF NOT EXISTS current_term VARCHAR(50);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS academic_year VARCHAR(10);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- 2. Add enrollment_number column to students table (if you want to use it)
-- OR you can use the existing admission_number column
-- The existing admission_number column serves the same purpose
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_number VARCHAR(50);

-- 3. Create student_fees table for tracking fee payments
CREATE TABLE IF NOT EXISTS student_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    academic_year VARCHAR(10) NOT NULL,
    term VARCHAR(20) NOT NULL,
    
    -- Fee amounts
    total_fees DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
    balance DECIMAL(10, 2) GENERATED ALWAYS AS (total_fees - amount_paid) STORED,
    
    -- Status
    fee_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (fee_status IN ('pending', 'partial', 'paid', 'overdue')),
    due_date DATE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    
    UNIQUE(student_id, academic_year, term)
);

-- 4. Create fee_payments table for tracking individual payments
CREATE TABLE IF NOT EXISTS fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_fee_id UUID NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'ecocash', 'onemoney', 'innbucks', 'zipit', 'other')),
    reference_number VARCHAR(100),
    
    -- Receipt
    receipt_url TEXT NOT NULL, -- URL to uploaded receipt image/PDF
    receipt_file_name VARCHAR(255),
    
    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMP,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_fees_student_id ON student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_school_id ON student_fees(school_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_status ON student_fees(fee_status);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_fee_id ON fee_payments(student_fee_id);

-- 6. Enable RLS on new tables
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for student_fees
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

-- 8. RLS Policies for fee_payments
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

-- 9. Create storage bucket for fee receipts (run this separately or via Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('fee-receipts', 'fee-receipts', true)
-- ON CONFLICT DO NOTHING;

-- 10. Update function to recalculate fee status
-- This function handles INSERT, UPDATE, and DELETE on fee_payments
CREATE OR REPLACE FUNCTION update_fee_status()
RETURNS TRIGGER AS $$
DECLARE
    target_fee_id UUID;
    total_paid DECIMAL(10, 2);
    fee_total DECIMAL(10, 2);
BEGIN
    -- Get the student_fee_id based on operation type
    IF TG_OP = 'DELETE' THEN
        target_fee_id := OLD.student_fee_id;
    ELSE
        target_fee_id := NEW.student_fee_id;
    END IF;
    
    -- Calculate total paid for this fee record
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM fee_payments 
    WHERE student_fee_id = target_fee_id;
    
    -- Get the total_fees for comparison
    SELECT total_fees INTO fee_total
    FROM student_fees
    WHERE id = target_fee_id;
    
    -- Update the parent student_fees record
    UPDATE student_fees
    SET 
        amount_paid = total_paid,
        fee_status = CASE
            WHEN total_paid >= fee_total THEN 'paid'
            WHEN total_paid > 0 THEN 'partial'
            ELSE 'pending'
        END,
        updated_at = NOW()
    WHERE id = target_fee_id;
    
    -- Return appropriate value based on operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic fee status updates
DROP TRIGGER IF EXISTS update_fee_status_trigger ON fee_payments;
CREATE TRIGGER update_fee_status_trigger
    AFTER INSERT OR UPDATE OR DELETE ON fee_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_fee_status();

-- 11. Create storage bucket for fee receipts
-- Run this command in Supabase SQL Editor:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fee-receipts', 'fee-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 12. Storage policies for fee-receipts bucket
-- Allow authenticated users to upload receipts
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'fee-receipts');

-- Allow public read access to receipts
DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;
CREATE POLICY "Public can view receipts" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'fee-receipts');

-- Allow users to update their own uploads
DROP POLICY IF EXISTS "Users can update own receipts" ON storage.objects;
CREATE POLICY "Users can update own receipts" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'fee-receipts');

-- Done!
-- After running this, refresh your schema cache in Supabase

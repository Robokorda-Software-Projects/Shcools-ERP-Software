-- STEP 2: Create fee tracking tables
-- Run this SECOND (after 01_add_school_columns.sql)
-- =====================================================

-- Drop existing tables if they exist (to recreate with correct schema)
DROP TABLE IF EXISTS fee_payments CASCADE;
DROP TABLE IF EXISTS student_fees CASCADE;

-- Create student_fees table for tracking fee payments
CREATE TABLE student_fees (
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

-- Create fee_payments table for tracking individual payments
CREATE TABLE fee_payments (
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
    receipt_url TEXT, -- URL to uploaded receipt image/PDF (made optional for flexibility)
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_fees_student_id ON student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_school_id ON student_fees(school_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_status ON student_fees(fee_status);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_fee_id ON fee_payments(student_fee_id);

-- Done! Now run 03_fee_rls_policies.sql

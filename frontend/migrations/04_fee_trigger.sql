-- STEP 4: Create trigger function for auto-updating fee status
-- Run this FOURTH (after 03_fee_rls_policies.sql)
-- =====================================================

-- Update function to recalculate fee status
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

-- Done! Now run 05_storage_bucket.sql

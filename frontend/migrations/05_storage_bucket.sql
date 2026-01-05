-- STEP 5: Create storage bucket for fee receipts
-- Run this LAST (after 04_fee_trigger.sql)
-- =====================================================

-- Create storage bucket for fee receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fee-receipts', 'fee-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for fee-receipts bucket
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

-- ALL DONE!
-- Refresh your schema cache in Supabase dashboard

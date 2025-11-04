-- KYC Documents Storage Bucket Migration
-- Create secure storage bucket for KYC identity documents

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('kyc-documents', 'kyc-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for KYC documents
-- Users can upload their own KYC documents
CREATE POLICY "Users can upload their own KYC documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'kyc-documents' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own KYC documents
CREATE POLICY "Users can view their own KYC documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'kyc-documents' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can view all KYC documents
CREATE POLICY "Admins can view all KYC documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'kyc-documents' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Users can update their own KYC documents
CREATE POLICY "Users can update their own KYC documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'kyc-documents' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own KYC documents
CREATE POLICY "Users can delete their own KYC documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'kyc-documents' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add indexes for better performance on KYC queries
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users (kyc_status);
CREATE INDEX IF NOT EXISTS idx_users_kyc_verified ON users (kyc_verified);
CREATE INDEX IF NOT EXISTS idx_users_kyc_submitted_at ON users (kyc_submitted_at);

-- Add a function to clean up KYC documents when user is deleted
CREATE OR REPLACE FUNCTION cleanup_kyc_documents()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete associated KYC documents from storage
  DELETE FROM storage.objects 
  WHERE bucket_id = 'kyc-documents' 
  AND name LIKE OLD.id::text || '/%';
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to clean up KYC documents when users are deleted
DROP TRIGGER IF EXISTS trigger_cleanup_kyc_documents ON users;
CREATE TRIGGER trigger_cleanup_kyc_documents
  AFTER DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_kyc_documents();

-- Add a function to automatically update kyc_completed when kyc_verified changes
CREATE OR REPLACE FUNCTION update_kyc_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Set kyc_completed to true when kyc_verified becomes true
  IF NEW.kyc_verified = true AND (OLD.kyc_verified IS NULL OR OLD.kyc_verified = false) THEN
    NEW.kyc_completed = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update kyc_completed
DROP TRIGGER IF EXISTS trigger_update_kyc_completed ON users;
CREATE TRIGGER trigger_update_kyc_completed
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_kyc_completed();

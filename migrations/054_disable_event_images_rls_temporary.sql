-- Temporary fix: Disable RLS for event-images bucket
-- This is a more aggressive approach if the previous migration doesn't work

-- First, let's ensure the event-images bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images', 
  true,
  26214400, -- 25MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Drop ALL existing policies on storage.objects for event-images
DO $$ 
DECLARE
    policy_name text;
BEGIN
    -- Get all policy names for storage.objects
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_name);
    END LOOP;
END $$;

-- Create a very simple, permissive policy for event-images
CREATE POLICY "event_images_allow_all"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'event-images')
WITH CHECK (bucket_id = 'event-images');

-- Also allow anonymous users to view images (for public access)
CREATE POLICY "event_images_public_view"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'event-images');

-- Grant all necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- Ensure bucket is public and properly configured
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'event-images';

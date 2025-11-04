-- Fix RLS policies for event-images storage bucket
-- This migration addresses the "new row violates row-level security policy" error when uploading event images

-- First, let's check if the event-images bucket exists and create it if it doesn't
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images', 
  true,
  26214400, -- 25MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing RLS policies on the event-images bucket if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to event images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload to event-images bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view event images" ON storage.objects;

-- Create new RLS policies for event-images bucket
-- Policy 1: Allow authenticated users to upload images to event-images bucket
CREATE POLICY "Allow authenticated users to upload event images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-images' 
  AND auth.uid() IS NOT NULL
);

-- Policy 2: Allow authenticated users to update their own uploaded images
CREATE POLICY "Allow users to update their own event images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Allow authenticated users to delete their own uploaded images
CREATE POLICY "Allow users to delete their own event images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Allow public access to view event images (for displaying in the app)
CREATE POLICY "Allow public access to view event images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'event-images');

-- Alternative approach: If the above doesn't work, we can temporarily disable RLS for the event-images bucket
-- Uncomment the following lines if the policies above don't resolve the issue:

-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
-- 
-- -- Re-enable RLS but with a more permissive policy
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- 
-- -- Create a very permissive policy for event-images
-- CREATE POLICY "Permissive event images policy"
-- ON storage.objects
-- FOR ALL
-- TO authenticated
-- USING (bucket_id = 'event-images')
-- WITH CHECK (bucket_id = 'event-images');

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- Ensure the bucket is properly configured
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'event-images';

-- Fix RLS policies for magazine-images storage bucket
-- This migration addresses the "new row violates row-level security policy" error when uploading magazine images

-- First, let's check if the magazine-images bucket exists and create it if it doesn't
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'magazine-images',
  'magazine-images', 
  true,
  26214400, -- 25MB limit for high-quality magazine pages
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing RLS policies on the magazine-images bucket if they exist
DROP POLICY IF EXISTS "Public can view magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view magazine images" ON storage.objects;

-- Create new RLS policies for magazine-images bucket
-- Policy 1: Allow authenticated users to upload images to magazine-images bucket
CREATE POLICY "Allow authenticated users to upload magazine images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'magazine-images' 
  AND auth.uid() IS NOT NULL
);

-- Policy 2: Allow authenticated users to update their own uploaded images
CREATE POLICY "Allow users to update their own magazine images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'magazine-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'magazine-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Allow authenticated users to delete their own uploaded images
CREATE POLICY "Allow users to delete their own magazine images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'magazine-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Allow public access to view magazine images (for displaying in the app)
CREATE POLICY "Allow public access to view magazine images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'magazine-images');

-- Verify the bucket is public
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE id = 'magazine-images' 
    AND public = false
  ) THEN
    RAISE NOTICE 'Warning: magazine-images bucket is not set to public. Please check storage.buckets table.';
  ELSE
    RAISE NOTICE 'magazine-images bucket is set to public.';
  END IF;
END $$;


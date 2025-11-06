-- Ensure News Storage Buckets are Public and Accessible
-- This migration fixes issues where images don't show up on Vercel deployments

-- Ensure buckets exist and are marked as public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('news-images', 'news-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  ('news-videos', 'news-videos', true, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/mov']),
  ('news-featured', 'news-featured', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE 
SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "News images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "News videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "News featured images are publicly accessible" ON storage.objects;

-- Create public read access policies for storage objects
-- These policies allow anyone (including unauthenticated users) to read images
CREATE POLICY "News images are publicly accessible" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'news-images');

CREATE POLICY "News videos are publicly accessible" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'news-videos');

CREATE POLICY "News featured images are publicly accessible" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'news-featured');

-- Verify the buckets are public (this is informational, won't fail if already correct)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE id IN ('news-images', 'news-videos', 'news-featured') 
    AND public = false
  ) THEN
    RAISE NOTICE 'Warning: Some storage buckets are not set to public. Please check storage.buckets table.';
  ELSE
    RAISE NOTICE 'All news storage buckets are set to public.';
  END IF;
END $$;


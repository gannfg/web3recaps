-- Migration 038: Fix storage RLS policies for news media uploads
-- This migration simplifies the storage policies to allow authenticated users to upload

-- Drop existing policies for news storage buckets
DROP POLICY IF EXISTS "News authors can upload images" ON storage.objects;
DROP POLICY IF EXISTS "News authors can update their images" ON storage.objects;
DROP POLICY IF EXISTS "News authors can delete their images" ON storage.objects;

DROP POLICY IF EXISTS "News authors can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "News authors can update their videos" ON storage.objects;
DROP POLICY IF EXISTS "News authors can delete their videos" ON storage.objects;

DROP POLICY IF EXISTS "News authors can upload featured images" ON storage.objects;
DROP POLICY IF EXISTS "News authors can update featured images" ON storage.objects;
DROP POLICY IF EXISTS "News authors can delete featured images" ON storage.objects;

-- Create simplified policies that allow any authenticated user to upload
CREATE POLICY "Authenticated users can upload news images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'news-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can update news images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'news-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can delete news images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'news-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can upload news videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'news-videos' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can update news videos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'news-videos' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can delete news videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'news-videos' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can upload news featured images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'news-featured' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can update news featured images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'news-featured' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can delete news featured images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'news-featured' AND
    auth.uid() IS NOT NULL
  );

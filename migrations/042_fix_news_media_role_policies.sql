-- Fix News Media Storage Role Policies
-- Update storage policies to match API route role expectations

-- Drop existing policies
DROP POLICY IF EXISTS "News authors can upload images" ON storage.objects;
DROP POLICY IF EXISTS "News authors can update their images" ON storage.objects;
DROP POLICY IF EXISTS "News authors can delete their images" ON storage.objects;
DROP POLICY IF EXISTS "News authors can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "News authors can update their videos" ON storage.objects;
DROP POLICY IF EXISTS "News authors can delete their videos" ON storage.objects;
DROP POLICY IF EXISTS "News authors can upload featured images" ON storage.objects;
DROP POLICY IF EXISTS "News authors can update featured images" ON storage.objects;
DROP POLICY IF EXISTS "News authors can delete featured images" ON storage.objects;

-- Recreate policies with correct role names (uppercase enum values)
CREATE POLICY "News authors can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'news-images' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'AUTHOR')
    )
  );

CREATE POLICY "News authors can update their images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'news-images' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'AUTHOR')
    )
  );

CREATE POLICY "News authors can delete their images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'news-images' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'AUTHOR')
    )
  );

CREATE POLICY "News authors can upload videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'news-videos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'AUTHOR')
    )
  );

CREATE POLICY "News authors can update their videos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'news-videos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'AUTHOR')
    )
  );

CREATE POLICY "News authors can delete their videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'news-videos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'AUTHOR')
    )
  );

CREATE POLICY "News authors can upload featured images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'news-featured' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'AUTHOR')
    )
  );

CREATE POLICY "News authors can update featured images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'news-featured' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'AUTHOR')
    )
  );

CREATE POLICY "News authors can delete featured images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'news-featured' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'AUTHOR')
    )
  );

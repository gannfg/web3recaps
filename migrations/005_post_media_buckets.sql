-- Post Media Storage Buckets Migration
-- Add storage buckets for post images and videos

-- Create storage buckets for post media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  -- Post images (10MB limit)
  ('post-images', 'post-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  -- Post videos (50MB limit) 
  ('post-videos', 'post-videos', true, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for post images
CREATE POLICY "Post images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-images' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own post images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'post-images' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own post images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-images' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create storage policies for post videos
CREATE POLICY "Post videos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-videos');

CREATE POLICY "Authenticated users can upload post videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-videos' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own post videos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'post-videos' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own post videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-videos' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add indexes for better performance on post media queries
CREATE INDEX IF NOT EXISTS idx_posts_images_gin ON posts USING GIN (images);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts (author_id);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts (post_type);

-- Add a function to clean up orphaned post media when posts are deleted
CREATE OR REPLACE FUNCTION cleanup_post_media()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete associated images from storage
  IF OLD.images IS NOT NULL AND array_length(OLD.images, 1) > 0 THEN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'post-images' 
    AND name LIKE OLD.author_id::text || '/%';
  END IF;
  
  -- Delete associated videos from storage (if videos column exists)
  -- Note: This assumes videos are stored in a separate column
  -- You may need to adjust based on your actual schema
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to clean up media when posts are deleted
DROP TRIGGER IF EXISTS trigger_cleanup_post_media ON posts;
CREATE TRIGGER trigger_cleanup_post_media
  AFTER DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_post_media();

-- Add a function to validate post content length
CREATE OR REPLACE FUNCTION validate_post_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure content is not empty
  IF NEW.content IS NULL OR trim(NEW.content) = '' THEN
    RAISE EXCEPTION 'Post content cannot be empty';
  END IF;
  
  -- Ensure content is not too long (Twitter-like limit)
  IF length(NEW.content) > 280 THEN
    RAISE EXCEPTION 'Post content cannot exceed 280 characters';
  END IF;
  
  -- Ensure images array is not too large
  IF NEW.images IS NOT NULL AND array_length(NEW.images, 1) > 4 THEN
    RAISE EXCEPTION 'Posts cannot have more than 4 images';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate post content
DROP TRIGGER IF EXISTS trigger_validate_post_content ON posts;
CREATE TRIGGER trigger_validate_post_content
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION validate_post_content();

-- Add a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on posts
DROP TRIGGER IF EXISTS trigger_update_posts_updated_at ON posts;
CREATE TRIGGER trigger_update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

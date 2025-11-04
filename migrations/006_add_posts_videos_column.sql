-- Add videos column to posts table
-- Support for video uploads in posts

-- Add videos column to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS videos TEXT[] DEFAULT '{}';

-- Add index for videos column
CREATE INDEX IF NOT EXISTS idx_posts_videos_gin ON posts USING GIN (videos);

-- Update the cleanup function to handle videos
CREATE OR REPLACE FUNCTION cleanup_post_media()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete associated images from storage
  IF OLD.images IS NOT NULL AND array_length(OLD.images, 1) > 0 THEN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'post-images' 
    AND name LIKE OLD.author_id::text || '/%';
  END IF;
  
  -- Delete associated videos from storage
  IF OLD.videos IS NOT NULL AND array_length(OLD.videos, 1) > 0 THEN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'post-videos' 
    AND name LIKE OLD.author_id::text || '/%';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Update the validation function to handle videos
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
  
  -- Ensure videos array is not too large
  IF NEW.videos IS NOT NULL AND array_length(NEW.videos, 1) > 2 THEN
    RAISE EXCEPTION 'Posts cannot have more than 2 videos';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

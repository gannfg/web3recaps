-- Fix posts validation functions to handle jsonb images column correctly
-- The images column is jsonb, not TEXT[], so we need to use jsonb functions

-- Update the validation function to handle jsonb images correctly
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
  
  -- Ensure images array is not too large (jsonb array)
  IF NEW.images IS NOT NULL AND jsonb_array_length(NEW.images) > 4 THEN
    RAISE EXCEPTION 'Posts cannot have more than 4 images';
  END IF;
  
  -- Ensure videos array is not too large (TEXT[] array)
  IF NEW.videos IS NOT NULL AND array_length(NEW.videos, 1) > 2 THEN
    RAISE EXCEPTION 'Posts cannot have more than 2 videos';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the cleanup function to handle jsonb images correctly
CREATE OR REPLACE FUNCTION cleanup_post_media()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete associated images from storage (jsonb array)
  IF OLD.images IS NOT NULL AND jsonb_array_length(OLD.images) > 0 THEN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'post-images' 
    AND name LIKE OLD.author_id::text || '/%';
  END IF;
  
  -- Delete associated videos from storage (TEXT[] array)
  IF OLD.videos IS NOT NULL AND array_length(OLD.videos, 1) > 0 THEN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'post-videos' 
    AND name LIKE OLD.author_id::text || '/%';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

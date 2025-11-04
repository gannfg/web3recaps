-- News Media Storage Buckets Migration
-- Create storage buckets for news article images and videos

-- Create storage buckets for news media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  -- News article images
  ('news-images', 'news-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  
  -- News article videos
  ('news-videos', 'news-videos', true, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/mov']),
  
  -- News article featured images (higher quality)
  ('news-featured', 'news-featured', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for news images
CREATE POLICY "News images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'news-images');

CREATE POLICY "News authors can upload images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'news-images' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'BUILDER')
    )
  );

CREATE POLICY "News authors can update their images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'news-images' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'BUILDER')
    )
  );

CREATE POLICY "News authors can delete their images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'news-images' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'BUILDER')
    )
  );

-- Create storage policies for news videos
CREATE POLICY "News videos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'news-videos');

CREATE POLICY "News authors can upload videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'news-videos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'BUILDER')
    )
  );

CREATE POLICY "News authors can update their videos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'news-videos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'BUILDER')
    )
  );

CREATE POLICY "News authors can delete their videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'news-videos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'BUILDER')
    )
  );

-- Create storage policies for news featured images
CREATE POLICY "News featured images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'news-featured');

CREATE POLICY "News authors can upload featured images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'news-featured' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'BUILDER')
    )
  );

CREATE POLICY "News authors can update featured images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'news-featured' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'BUILDER')
    )
  );

CREATE POLICY "News authors can delete featured images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'news-featured' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'BUILDER')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_news_media_article_id ON news_media(article_id);
CREATE INDEX IF NOT EXISTS idx_news_media_media_type ON news_media(media_type);
CREATE INDEX IF NOT EXISTS idx_news_media_is_featured ON news_media(is_featured);

-- Add comments to explain the buckets
COMMENT ON TABLE news_media IS 'Stores metadata for media files associated with news articles';
COMMENT ON COLUMN news_media.media_type IS 'Type of media: image, video, audio, document';
COMMENT ON COLUMN news_media.file_url IS 'URL to the media file in Supabase storage';
COMMENT ON COLUMN news_media.is_featured IS 'Whether this media is the featured image for the article';

-- Enable RLS on news_media table
ALTER TABLE news_media ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for news_media table
CREATE POLICY "News media are publicly readable" ON news_media
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert news media" ON news_media
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'BUILDER')
    )
  );

CREATE POLICY "Users can update their own news media" ON news_media
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'BUILDER')
    )
  );

CREATE POLICY "Users can delete their own news media" ON news_media
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'BUILDER')
    )
  );

-- Migration 037: Add RLS policies for news_media table
-- This migration adds Row Level Security policies to the news_media table
-- to allow authenticated users with ADMIN or BUILDER roles to manage media

-- Enable RLS on news_media table (if not already enabled)
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

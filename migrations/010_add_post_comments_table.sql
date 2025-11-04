-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  post_short_id BIGINT NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 280),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_author_id ON post_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at);

-- Add foreign key constraint for post_short_id
ALTER TABLE post_comments 
ADD CONSTRAINT fk_post_comments_post_short_id 
FOREIGN KEY (post_short_id) REFERENCES posts(short_id) ON DELETE CASCADE;

-- Add foreign key constraint for author_id
ALTER TABLE post_comments 
ADD CONSTRAINT fk_post_comments_author_id 
FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_post_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_comments_updated_at
  BEFORE UPDATE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comments_updated_at();

-- Add RLS policies
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read comments
CREATE POLICY "Anyone can read comments" ON post_comments
  FOR SELECT USING (true);

-- Policy: Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments" ON post_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Policy: Users can update their own comments
CREATE POLICY "Users can update their own comments" ON post_comments
  FOR UPDATE USING (auth.uid() = author_id);

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON post_comments
  FOR DELETE USING (auth.uid() = author_id);

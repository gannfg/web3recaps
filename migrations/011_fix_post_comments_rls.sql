-- Fix RLS policies for post_comments table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read comments" ON post_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON post_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON post_comments;

-- Create new RLS policies for post_comments
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

-- Also ensure RLS is enabled
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

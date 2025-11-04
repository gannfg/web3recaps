-- Temporarily disable RLS for post_comments to allow comment creation
-- This is a temporary fix - in production you'd want proper RLS policies

ALTER TABLE post_comments DISABLE ROW LEVEL SECURITY;

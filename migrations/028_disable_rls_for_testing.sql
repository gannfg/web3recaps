-- Migration: 028_disable_rls_for_testing.sql
-- Temporarily disable RLS for testing purposes

-- Disable RLS on news tables for testing
ALTER TABLE news_articles DISABLE ROW LEVEL SECURITY;
ALTER TABLE news_article_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE news_article_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE news_article_bookmarks DISABLE ROW LEVEL SECURITY;

-- Note: This is for testing only. Re-enable RLS in production!

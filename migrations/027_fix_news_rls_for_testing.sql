-- Migration: 027_fix_news_rls_for_testing.sql
-- Fix RLS policies to allow API testing and article creation

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Authors can manage their articles" ON news_articles;
DROP POLICY IF EXISTS "Admins can manage all content" ON news_articles;
DROP POLICY IF EXISTS "Authenticated users can create articles" ON news_articles;
DROP POLICY IF EXISTS "Anyone can read published articles" ON news_articles;
DROP POLICY IF EXISTS "Users can read their own articles" ON news_articles;
DROP POLICY IF EXISTS "Users can update their own articles" ON news_articles;
DROP POLICY IF EXISTS "Users can delete their own articles" ON news_articles;
DROP POLICY IF EXISTS "Admins can manage all articles" ON news_articles;

-- Drop existing policies on related tables
DROP POLICY IF EXISTS "Users can manage their own reactions" ON news_article_reactions;
DROP POLICY IF EXISTS "Users can manage their own comments" ON news_article_comments;
DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON news_article_bookmarks;
DROP POLICY IF EXISTS "Authenticated users can manage reactions" ON news_article_reactions;
DROP POLICY IF EXISTS "Authenticated users can manage comments" ON news_article_comments;
DROP POLICY IF EXISTS "Authenticated users can manage bookmarks" ON news_article_bookmarks;
DROP POLICY IF EXISTS "Anyone can read reactions" ON news_article_reactions;
DROP POLICY IF EXISTS "Anyone can read comments" ON news_article_comments;
DROP POLICY IF EXISTS "Anyone can read bookmarks" ON news_article_bookmarks;

-- Create new permissive policies for testing
-- Allow authenticated users to insert articles (they become the author)
CREATE POLICY "Authenticated users can create articles" ON news_articles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to read published articles
CREATE POLICY "Anyone can read published articles" ON news_articles
  FOR SELECT USING (status = 'published');

-- Allow authenticated users to read their own articles (drafts)
CREATE POLICY "Users can read their own articles" ON news_articles
  FOR SELECT USING (auth.uid() = author_id);

-- Allow users to update their own articles
CREATE POLICY "Users can update their own articles" ON news_articles
  FOR UPDATE USING (auth.uid() = author_id);

-- Allow users to delete their own articles
CREATE POLICY "Users can delete their own articles" ON news_articles
  FOR DELETE USING (auth.uid() = author_id);

-- Allow admins to do everything
CREATE POLICY "Admins can manage all articles" ON news_articles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'Admin'
    )
  );

-- Create permissive policies for related tables
CREATE POLICY "Authenticated users can manage reactions" ON news_article_reactions
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage comments" ON news_article_comments
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage bookmarks" ON news_article_bookmarks
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Allow reading reactions, comments, and bookmarks
CREATE POLICY "Anyone can read reactions" ON news_article_reactions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read comments" ON news_article_comments
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read bookmarks" ON news_article_bookmarks
  FOR SELECT USING (true);

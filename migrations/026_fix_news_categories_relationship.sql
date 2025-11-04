-- Fix News Categories Relationship
-- Migration: 026_fix_news_categories_relationship.sql

-- First, add the category_id column to news_articles
ALTER TABLE news_articles 
ADD COLUMN category_id UUID REFERENCES news_categories(id) ON DELETE SET NULL;

-- Update existing articles to use the first category (if any exist)
UPDATE news_articles 
SET category_id = (SELECT id FROM news_categories LIMIT 1)
WHERE category_id IS NULL;

-- Make category_id NOT NULL after updating existing records
ALTER TABLE news_articles 
ALTER COLUMN category_id SET NOT NULL;

-- Drop the old category string column
ALTER TABLE news_articles 
DROP COLUMN category;

-- Add indexes for better performance
CREATE INDEX idx_news_articles_category_id ON news_articles(category_id);
CREATE INDEX idx_news_articles_status ON news_articles(status);
CREATE INDEX idx_news_articles_published_at ON news_articles(published_at);
CREATE INDEX idx_news_articles_author_id ON news_articles(author_id);

-- Update RLS policies to work with the new relationship
DROP POLICY IF EXISTS "Authors can manage their articles" ON news_articles;
DROP POLICY IF EXISTS "Admins can manage all content" ON news_articles;

-- Recreate policies with proper category relationship
CREATE POLICY "Authors can manage their articles" ON news_articles
  FOR ALL USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all content" ON news_articles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'Admin'
    )
  );

-- Enable RLS on news_articles
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

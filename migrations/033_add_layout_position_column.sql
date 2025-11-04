-- Add layout_position column to news_articles table
-- This column will store the position of articles in the newspaper-style layout

ALTER TABLE news_articles 
ADD COLUMN layout_position VARCHAR(50);

-- Add index for better performance when filtering by layout position
CREATE INDEX idx_news_articles_layout_position ON news_articles(layout_position);

-- Add comment to explain the column
COMMENT ON COLUMN news_articles.layout_position IS 'Position in the newspaper layout: featured_main, featured_left, featured_right, secondary_1-6, or null for regular articles';

-- Optimize engagement system with database triggers for automatic count updates
-- This eliminates the need for manual count calculations in API calls

-- Function to update like counts for posts
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1, updated_at = NOW() WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0), updated_at = NOW() WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update like counts for projects
CREATE OR REPLACE FUNCTION update_project_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE projects SET likes_count = likes_count + 1, updated_at = NOW() WHERE id = NEW.project_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE projects SET likes_count = GREATEST(likes_count - 1, 0), updated_at = NOW() WHERE id = OLD.project_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update like counts for news articles
CREATE OR REPLACE FUNCTION update_news_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE news_articles SET like_count = like_count + 1, updated_at = NOW() WHERE id = NEW.article_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE news_articles SET like_count = GREATEST(like_count - 1, 0), updated_at = NOW() WHERE id = OLD.article_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update bookmark counts for projects
CREATE OR REPLACE FUNCTION update_project_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE projects SET bookmarks_count = bookmarks_count + 1, updated_at = NOW() WHERE id = NEW.project_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE projects SET bookmarks_count = GREATEST(bookmarks_count - 1, 0), updated_at = NOW() WHERE id = OLD.project_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update bookmark counts for news articles
CREATE OR REPLACE FUNCTION update_news_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE news_articles SET bookmark_count = bookmark_count + 1, updated_at = NOW() WHERE id = NEW.article_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE news_articles SET bookmark_count = GREATEST(bookmark_count - 1, 0), updated_at = NOW() WHERE id = OLD.article_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update comment counts for posts
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1, updated_at = NOW() WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0), updated_at = NOW() WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update comment counts for news articles
CREATE OR REPLACE FUNCTION update_news_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE news_articles SET comment_count = comment_count + 1, updated_at = NOW() WHERE id = NEW.article_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE news_articles SET comment_count = GREATEST(comment_count - 1, 0), updated_at = NOW() WHERE id = OLD.article_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add bookmark_count column to news_articles if it doesn't exist (posts and projects already have bookmarks_count)
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS bookmark_count INTEGER DEFAULT 0;

-- Create triggers for posts (posts don't have bookmarks in current schema)
DROP TRIGGER IF EXISTS posts_like_count_trigger ON post_likes;
CREATE TRIGGER posts_like_count_trigger
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

DROP TRIGGER IF EXISTS posts_comment_count_trigger ON post_comments;
CREATE TRIGGER posts_comment_count_trigger
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Create triggers for projects
DROP TRIGGER IF EXISTS projects_like_count_trigger ON project_likes;
CREATE TRIGGER projects_like_count_trigger
  AFTER INSERT OR DELETE ON project_likes
  FOR EACH ROW EXECUTE FUNCTION update_project_like_count();

DROP TRIGGER IF EXISTS projects_bookmark_count_trigger ON project_bookmarks;
CREATE TRIGGER projects_bookmark_count_trigger
  AFTER INSERT OR DELETE ON project_bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_project_bookmark_count();

-- Events don't have likes/bookmarks tables in current schema

-- Create triggers for news articles
DROP TRIGGER IF EXISTS news_articles_like_count_trigger ON news_article_reactions;
CREATE TRIGGER news_articles_like_count_trigger
  AFTER INSERT OR DELETE ON news_article_reactions
  FOR EACH ROW EXECUTE FUNCTION update_news_like_count();

DROP TRIGGER IF EXISTS news_articles_bookmark_count_trigger ON news_article_bookmarks;
CREATE TRIGGER news_articles_bookmark_count_trigger
  AFTER INSERT OR DELETE ON news_article_bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_news_bookmark_count();

DROP TRIGGER IF EXISTS news_articles_comment_count_trigger ON news_article_comments;
CREATE TRIGGER news_articles_comment_count_trigger
  AFTER INSERT OR DELETE ON news_article_comments
  FOR EACH ROW EXECUTE FUNCTION update_news_comment_count();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_likes_entity_user ON post_likes(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_project_likes_entity_user ON project_likes(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_project_bookmarks_entity_user ON project_bookmarks(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_news_article_reactions_entity_user ON news_article_reactions(article_id, user_id);
CREATE INDEX IF NOT EXISTS idx_news_article_bookmarks_entity_user ON news_article_bookmarks(article_id, user_id);

-- Update existing counts to match actual data
UPDATE posts SET likes_count = (
  SELECT COUNT(*) FROM post_likes WHERE post_id = posts.id
);

UPDATE projects SET likes_count = (
  SELECT COUNT(*) FROM project_likes WHERE project_id = projects.id
);

UPDATE projects SET bookmarks_count = (
  SELECT COUNT(*) FROM project_bookmarks WHERE project_id = projects.id
);

UPDATE news_articles SET like_count = (
  SELECT COUNT(*) FROM news_article_reactions WHERE article_id = news_articles.id
);

UPDATE news_articles SET bookmark_count = (
  SELECT COUNT(*) FROM news_article_bookmarks WHERE article_id = news_articles.id
);

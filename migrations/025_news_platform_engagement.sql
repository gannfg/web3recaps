-- Enhanced News Platform Schema for Web3 Indonesia
-- Focus: Engagement, Social Features, SEO, Analytics
-- Migration: 025_news_platform_engagement.sql

-- News Articles Table (Enhanced)
CREATE TABLE news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  featured_image_alt TEXT,
  
  -- Author Information
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(100) NOT NULL,
  author_email VARCHAR(255),
  author_bio TEXT,
  author_avatar_url TEXT,
  author_twitter VARCHAR(100),
  author_linkedin VARCHAR(100),
  
  -- Content Classification
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  subcategory VARCHAR(50),
  tags TEXT[] DEFAULT '{}',
  source_type VARCHAR(20) NOT NULL DEFAULT 'internal',
  external_url TEXT,
  external_source VARCHAR(100),
  
  -- Publishing & SEO
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- SEO Optimization
  meta_title VARCHAR(60),
  meta_description VARCHAR(160),
  meta_keywords TEXT[],
  canonical_url TEXT,
  og_title VARCHAR(60),
  og_description VARCHAR(160),
  og_image_url TEXT,
  twitter_title VARCHAR(60),
  twitter_description VARCHAR(160),
  twitter_image_url TEXT,
  
  -- Content Metrics
  reading_time INTEGER, -- in minutes
  word_count INTEGER,
  view_count INTEGER DEFAULT 0,
  unique_view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  
  -- Engagement Metrics
  engagement_score DECIMAL(5,2) DEFAULT 0, -- Calculated score
  time_on_page DECIMAL(8,2) DEFAULT 0, -- Average time in seconds
  bounce_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
  scroll_depth DECIMAL(5,2) DEFAULT 0, -- Average scroll percentage
  
  -- Editorial Features
  is_featured BOOLEAN DEFAULT FALSE,
  is_breaking BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,
  is_editor_pick BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 0,
  editor_notes TEXT,
  
  -- Content Structure
  content_type VARCHAR(20) DEFAULT 'article',
  language VARCHAR(5) DEFAULT 'en',
  reading_level VARCHAR(20) DEFAULT 'intermediate', -- beginner, intermediate, advanced
  
  -- Social Features
  allow_comments BOOLEAN DEFAULT TRUE,
  allow_sharing BOOLEAN DEFAULT TRUE,
  allow_bookmarking BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Article Reactions (Enhanced Likes)
CREATE TABLE news_article_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL, -- 'like', 'love', 'wow', 'angry', 'sad'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(article_id, user_id, reaction_type)
);

-- Article Comments (Enhanced)
CREATE TABLE news_article_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES news_article_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT TRUE,
  is_pinned BOOLEAN DEFAULT FALSE,
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comment Reactions
CREATE TABLE news_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES news_article_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Article Bookmarks
CREATE TABLE news_article_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(article_id, user_id)
);

-- Article Shares (Enhanced)
CREATE TABLE news_article_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  platform VARCHAR(20) NOT NULL, -- 'twitter', 'facebook', 'linkedin', 'telegram', 'whatsapp', 'copy_link'
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Article Views (Enhanced Analytics)
CREATE TABLE news_article_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  time_on_page DECIMAL(8,2), -- in seconds
  scroll_depth DECIMAL(5,2), -- percentage
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Author Follows
CREATE TABLE news_author_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(author_id, follower_id)
);

-- Category Subscriptions
CREATE TABLE news_category_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  subscription_type VARCHAR(20) DEFAULT 'all', -- 'all', 'breaking', 'featured'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Newsletter Subscriptions (Enhanced)
CREATE TABLE news_newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  subscription_type VARCHAR(20) DEFAULT 'daily',
  categories TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}', -- User preferences
  verification_token VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  last_sent_at TIMESTAMP WITH TIME ZONE
);

-- Breaking News Alerts
CREATE TABLE news_breaking_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trending Articles (Real-time)
CREATE TABLE news_trending_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  score DECIMAL(10,4) NOT NULL,
  period VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly'
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- News Categories (Enhanced)
CREATE TABLE news_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  subscriber_count INTEGER DEFAULT 0,
  article_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- News Media (Enhanced)
CREATE TABLE news_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  media_type VARCHAR(20) NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  alt_text TEXT,
  caption TEXT,
  credit TEXT,
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_news_articles_status_published ON news_articles(status, published_at DESC);
CREATE INDEX idx_news_articles_slug ON news_articles(slug);
CREATE INDEX idx_news_articles_category ON news_articles(category);
CREATE INDEX idx_news_articles_featured ON news_articles(is_featured, published_at DESC);
CREATE INDEX idx_news_articles_breaking ON news_articles(is_breaking, published_at DESC);
CREATE INDEX idx_news_articles_trending ON news_articles(is_trending, published_at DESC);
CREATE INDEX idx_news_articles_engagement ON news_articles(engagement_score DESC, published_at DESC);
CREATE INDEX idx_news_articles_author ON news_articles(author_id);
CREATE INDEX idx_news_articles_tags ON news_articles USING GIN(tags);
CREATE INDEX idx_news_articles_search ON news_articles USING GIN(to_tsvector('english', title || ' ' || excerpt || ' ' || content));

-- Engagement Indexes
CREATE INDEX idx_news_reactions_article ON news_article_reactions(article_id);
CREATE INDEX idx_news_comments_article ON news_article_comments(article_id, created_at DESC);
CREATE INDEX idx_news_bookmarks_user ON news_article_bookmarks(user_id);
CREATE INDEX idx_news_shares_article ON news_article_shares(article_id);
CREATE INDEX idx_news_views_article ON news_article_views(article_id);
CREATE INDEX idx_news_views_date ON news_article_views(viewed_at);

-- RLS Policies
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_article_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_article_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_article_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_article_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_author_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_category_subscriptions ENABLE ROW LEVEL SECURITY;

-- Public read access for published articles
CREATE POLICY "Public can view published articles" ON news_articles
  FOR SELECT USING (status = 'published');

-- Public read access for comments
CREATE POLICY "Public can view approved comments" ON news_article_comments
  FOR SELECT USING (is_approved = true);

-- Authenticated users can react to articles
CREATE POLICY "Authenticated users can manage reactions" ON news_article_reactions
  FOR ALL USING (auth.uid() = user_id);

-- Authenticated users can comment
CREATE POLICY "Authenticated users can manage comments" ON news_article_comments
  FOR ALL USING (auth.uid() = user_id);

-- Authenticated users can bookmark
CREATE POLICY "Authenticated users can manage bookmarks" ON news_article_bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- Public can view shares and views (for analytics)
CREATE POLICY "Public can view shares" ON news_article_shares
  FOR SELECT USING (true);

CREATE POLICY "Public can view views" ON news_article_views
  FOR SELECT USING (true);

-- Authors can manage their articles
CREATE POLICY "Authors can manage their articles" ON news_articles
  FOR ALL USING (auth.uid() = author_id);

-- Admins can manage all content
CREATE POLICY "Admins can manage all content" ON news_articles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'Admin'
    )
  );

-- Insert default categories
INSERT INTO news_categories (name, slug, description, color, icon, sort_order) VALUES
('Breaking News', 'breaking-news', 'Latest breaking news in Web3 Indonesia', '#EF4444', 'zap', 1),
('DeFi', 'defi', 'Decentralized Finance news and updates', '#3B82F6', 'coins', 2),
('NFTs', 'nfts', 'Non-Fungible Token news and trends', '#8B5CF6', 'image', 3),
('Blockchain', 'blockchain', 'Blockchain technology and infrastructure', '#10B981', 'link', 4),
('Regulation', 'regulation', 'Crypto and Web3 regulatory updates', '#F59E0B', 'scale', 5),
('Startups', 'startups', 'Web3 startup news and funding', '#EC4899', 'rocket', 6),
('Events', 'events', 'Web3 events and conferences', '#06B6D4', 'calendar', 7),
('Opinion', 'opinion', 'Editorial opinions and analysis', '#84CC16', 'message-circle', 8),
('Press Release', 'press-release', 'Official press releases', '#6B7280', 'file-text', 9),
('Education', 'education', 'Educational content and guides', '#8B5CF6', 'book-open', 10);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
('news-images', 'news-images', true),
('news-videos', 'news-videos', true),
('news-documents', 'news-documents', true);

-- Storage policies
CREATE POLICY "Public can view news media" ON storage.objects
  FOR SELECT USING (bucket_id IN ('news-images', 'news-videos', 'news-documents'));

CREATE POLICY "Authenticated users can upload news media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('news-images', 'news-videos', 'news-documents') 
    AND auth.role() = 'authenticated'
  );

-- Function to update engagement score
CREATE OR REPLACE FUNCTION update_article_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE news_articles 
  SET engagement_score = (
    (view_count * 1.0) + 
    (like_count * 2.0) + 
    (comment_count * 3.0) + 
    (share_count * 4.0) + 
    (bookmark_count * 2.5)
  ) / GREATEST(1, EXTRACT(EPOCH FROM (NOW() - published_at)) / 3600)
  WHERE id = COALESCE(NEW.article_id, OLD.article_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to update engagement score
CREATE TRIGGER update_engagement_on_view
  AFTER INSERT ON news_article_views
  FOR EACH ROW EXECUTE FUNCTION update_article_engagement_score();

CREATE TRIGGER update_engagement_on_reaction
  AFTER INSERT OR DELETE ON news_article_reactions
  FOR EACH ROW EXECUTE FUNCTION update_article_engagement_score();

CREATE TRIGGER update_engagement_on_comment
  AFTER INSERT OR DELETE ON news_article_comments
  FOR EACH ROW EXECUTE FUNCTION update_article_engagement_score();

CREATE TRIGGER update_engagement_on_share
  AFTER INSERT ON news_article_shares
  FOR EACH ROW EXECUTE FUNCTION update_article_engagement_score();

CREATE TRIGGER update_engagement_on_bookmark
  AFTER INSERT OR DELETE ON news_article_bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_article_engagement_score();

-- Performance Optimization Indexes
-- Add indexes for frequently queried fields to improve query performance

-- Teams table indexes
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);
CREATE INDEX IF NOT EXISTS idx_teams_project_type ON teams(project_type);
CREATE INDEX IF NOT EXISTS idx_teams_location ON teams(location);
CREATE INDEX IF NOT EXISTS idx_teams_created_at ON teams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teams_updated_at ON teams(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_teams_total_xp ON teams(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_teams_team_level ON teams(team_level DESC);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);
CREATE INDEX IF NOT EXISTS idx_teams_name_search ON teams USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_teams_description_search ON teams USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_teams_skills_gin ON teams USING gin(skills);
CREATE INDEX IF NOT EXISTS idx_teams_skills_required_gin ON teams USING gin(skills_required);

-- Team members table indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_is_active ON team_members(is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_team_members_joined_at ON team_members(joined_at DESC);

-- Posts table indexes
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON posts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_likes_count ON posts(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_comments_count ON posts(comments_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_short_id ON posts(short_id);
CREATE INDEX IF NOT EXISTS idx_posts_content_search ON posts USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_posts_tags_gin ON posts USING gin(tags);

-- Events table indexes
CREATE INDEX IF NOT EXISTS idx_events_creator_id ON events(creator_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_location_type ON events(location_type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_is_public ON events(is_public);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_xp_reward ON events(xp_reward DESC);
CREATE INDEX IF NOT EXISTS idx_events_title_search ON events USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_events_description_search ON events USING gin(to_tsvector('english', description));

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects(is_public);
CREATE INDEX IF NOT EXISTS idx_projects_is_featured ON projects(is_featured);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_views_count ON projects(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_projects_likes_count ON projects(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_projects_name_search ON projects USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_projects_description_search ON projects USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_projects_tags_gin ON projects USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_projects_category_gin ON projects USING gin(category);
CREATE INDEX IF NOT EXISTS idx_projects_tech_stack_gin ON projects USING gin(tech_stack);
CREATE INDEX IF NOT EXISTS idx_projects_blockchain_gin ON projects USING gin(blockchain);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_total_xp ON users(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level DESC);
CREATE INDEX IF NOT EXISTS idx_users_rank ON users(rank);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_users_display_name_search ON users USING gin(to_tsvector('english', display_name));
CREATE INDEX IF NOT EXISTS idx_users_skills_gin ON users USING gin(skills);

-- News articles table indexes
CREATE INDEX IF NOT EXISTS idx_news_articles_author_id ON news_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_category_id ON news_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_status ON news_articles(status);
CREATE INDEX IF NOT EXISTS idx_news_articles_is_featured ON news_articles(is_featured);
CREATE INDEX IF NOT EXISTS idx_news_articles_is_breaking ON news_articles(is_breaking);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_created_at ON news_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_views_count ON news_articles(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_likes_count ON news_articles(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_title_search ON news_articles USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_news_articles_content_search ON news_articles USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_news_articles_tags_gin ON news_articles USING gin(tags);

-- Magazines table indexes
CREATE INDEX IF NOT EXISTS idx_magazines_status ON magazines(status);
CREATE INDEX IF NOT EXISTS idx_magazines_issue_date ON magazines(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_magazines_created_at ON magazines(created_at DESC);

-- Magazine pages table indexes
CREATE INDEX IF NOT EXISTS idx_magazine_pages_magazine_id ON magazine_pages(magazine_id);
CREATE INDEX IF NOT EXISTS idx_magazine_pages_page_number ON magazine_pages(page_number);
CREATE INDEX IF NOT EXISTS idx_magazine_pages_sort_order ON magazine_pages(sort_order);

-- Project contributors table indexes
CREATE INDEX IF NOT EXISTS idx_project_contributors_project_id ON project_contributors(project_id);
CREATE INDEX IF NOT EXISTS idx_project_contributors_user_id ON project_contributors(user_id);
CREATE INDEX IF NOT EXISTS idx_project_contributors_is_active ON project_contributors(is_active);

-- Event attendance table indexes
CREATE INDEX IF NOT EXISTS idx_event_attendance_event_id ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_user_id ON event_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_status ON event_attendance(status);
CREATE INDEX IF NOT EXISTS idx_event_attendance_registered_at ON event_attendance(registered_at DESC);

-- Event organizers table indexes
CREATE INDEX IF NOT EXISTS idx_event_organizers_event_id ON event_organizers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_organizers_organizer_id ON event_organizers(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_organizers_organizer_type ON event_organizers(organizer_type);

-- Team invitations table indexes
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee_id ON team_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON team_invitations(expires_at);

-- Comments table indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id);

-- News article comments table indexes
CREATE INDEX IF NOT EXISTS idx_news_article_comments_article_id ON news_article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_news_article_comments_author_id ON news_article_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_news_article_comments_created_at ON news_article_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_article_comments_parent_comment_id ON news_article_comments(parent_comment_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_teams_status_created_at ON teams(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teams_project_type_status ON teams(project_type, status);
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_type_created ON posts(post_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_public_date ON events(is_public, event_date);
CREATE INDEX IF NOT EXISTS idx_events_type_date ON events(event_type, event_date);
CREATE INDEX IF NOT EXISTS idx_projects_public_featured ON projects(is_public, is_featured);
CREATE INDEX IF NOT EXISTS idx_projects_status_created ON projects(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_status ON news_articles(published_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_news_articles_featured_published ON news_articles(is_featured, published_at DESC);

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_teams_active_recruiting ON teams(created_at DESC) WHERE status = 'recruiting';
CREATE INDEX IF NOT EXISTS idx_events_upcoming ON events(event_date) WHERE event_date >= CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(created_at DESC) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(published_at DESC) WHERE status = 'published';

-- Analyze tables to update statistics
ANALYZE teams;
ANALYZE team_members;
ANALYZE posts;
ANALYZE events;
ANALYZE projects;
ANALYZE users;
ANALYZE news_articles;
ANALYZE magazines;
ANALYZE magazine_pages;
ANALYZE project_contributors;
ANALYZE event_attendance;
ANALYZE event_organizers;
ANALYZE team_invitations;
ANALYZE comments;
ANALYZE news_article_comments;

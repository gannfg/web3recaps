-- Enhanced Projects Migration
-- Steam-style project showcase with rich media and detailed information

-- Drop existing basic team_projects table and recreate with enhanced schema
DROP TABLE IF EXISTS team_projects CASCADE;

-- Create comprehensive projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name TEXT NOT NULL,
  tagline TEXT, -- Short catchy description (like Steam)
  description TEXT, -- Full description
  long_description TEXT, -- Detailed description for showcase page
  
  -- Ownership & Team
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  
  -- Status & Progress
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'published', 'archived')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Project Details
  project_type TEXT CHECK (project_type IN ('web_app', 'mobile_app', 'game', 'defi', 'nft', 'dao', 'tool', 'library', 'other')),
  category TEXT[], -- Multiple categories like ['DeFi', 'Gaming', 'Social']
  tags TEXT[], -- Searchable tags
  
  -- Media (Steam-style)
  banner_image TEXT, -- Main hero banner
  logo_image TEXT, -- Project logo/icon
  screenshots TEXT[] DEFAULT '{}', -- Array of screenshot URLs
  videos TEXT[] DEFAULT '{}', -- Array of video URLs (YouTube, Vimeo, etc)
  demo_images TEXT[] DEFAULT '{}', -- Demo/feature images
  
  -- Links & Resources
  github_url TEXT,
  demo_url TEXT,
  website_url TEXT,
  docs_url TEXT,
  figma_url TEXT,
  discord_url TEXT,
  twitter_url TEXT,
  
  -- Technical Details
  tech_stack TEXT[], -- Technologies used
  blockchain TEXT[], -- Blockchains/networks
  smart_contracts JSONB DEFAULT '{}', -- Contract addresses and details
  
  -- Project Metrics
  github_stars INTEGER DEFAULT 0,
  github_forks INTEGER DEFAULT 0,
  website_visits INTEGER DEFAULT 0,
  demo_interactions INTEGER DEFAULT 0,
  
  -- Dates & Timeline
  start_date DATE,
  end_date DATE,
  launch_date DATE,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Publishing & Visibility
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  featured_priority INTEGER DEFAULT 0,
  
  -- Engagement
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  bookmarks_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project team members table (who worked on this specific project)
CREATE TABLE IF NOT EXISTS project_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN ('lead', 'developer', 'designer', 'pm', 'marketing', 'contributor')),
  contribution_description TEXT,
  hours_contributed INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(project_id, user_id)
);

-- Create project updates/changelog table
CREATE TABLE IF NOT EXISTS project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  update_type TEXT DEFAULT 'general' CHECK (update_type IN ('general', 'feature', 'bugfix', 'release', 'milestone')),
  version TEXT,
  images TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project likes table
CREATE TABLE IF NOT EXISTS project_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(project_id, user_id)
);

-- Create project bookmarks table
CREATE TABLE IF NOT EXISTS project_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(project_id, user_id)
);

-- Create project views table for analytics
CREATE TABLE IF NOT EXISTS project_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for anonymous views
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects(is_public);
CREATE INDEX IF NOT EXISTS idx_projects_is_featured ON projects(is_featured);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects USING GIN(category);
CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_projects_tech_stack ON projects USING GIN(tech_stack);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

CREATE INDEX IF NOT EXISTS idx_project_contributors_project_id ON project_contributors(project_id);
CREATE INDEX IF NOT EXISTS idx_project_contributors_user_id ON project_contributors(user_id);

CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_likes_project_id ON project_likes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_bookmarks_project_id ON project_bookmarks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_views_project_id ON project_views(project_id);
CREATE INDEX IF NOT EXISTS idx_project_views_viewed_at ON project_views(viewed_at);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_project_views()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE projects 
    SET views_count = views_count + 1 
    WHERE id = NEW.project_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_project_views_trigger
    AFTER INSERT ON project_views
    FOR EACH ROW EXECUTE FUNCTION increment_project_views();

-- Create function to update likes count
CREATE OR REPLACE FUNCTION update_project_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE projects SET likes_count = likes_count + 1 WHERE id = NEW.project_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE projects SET likes_count = likes_count - 1 WHERE id = OLD.project_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_likes_count_trigger
    AFTER INSERT OR DELETE ON project_likes
    FOR EACH ROW EXECUTE FUNCTION update_project_likes_count();

-- Create function to update bookmarks count
CREATE OR REPLACE FUNCTION update_project_bookmarks_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE projects SET bookmarks_count = bookmarks_count + 1 WHERE id = NEW.project_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE projects SET bookmarks_count = bookmarks_count - 1 WHERE id = OLD.project_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_bookmarks_count_trigger
    AFTER INSERT OR DELETE ON project_bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_project_bookmarks_count();

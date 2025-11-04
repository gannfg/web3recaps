-- Enhanced Teams Migration
-- Supports multiple team membership, roles, invitations, and project tracking

-- First, update the existing teams table
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'recruiting' CHECK (status IN ('recruiting', 'active', 'completed', 'archived')),
ADD COLUMN IF NOT EXISTS project_type TEXT CHECK (project_type IN ('hackathon', 'startup', 'learning', 'freelance', 'open_source')),
ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS timeline TEXT,
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'remote',
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS figma_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS discord_url TEXT,
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS team_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS founded_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS budget_range TEXT,
ADD COLUMN IF NOT EXISTS equity_split JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS meeting_schedule TEXT,
ADD COLUMN IF NOT EXISTS skills_required TEXT[],
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Remove the old members array column since we'll use team_members table
ALTER TABLE teams DROP COLUMN IF EXISTS members;

-- Enhance the team_members table for multiple membership support
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'co_leader', 'developer', 'designer', 'pm', 'marketing', 'member')),
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT ARRAY['view'],
ADD COLUMN IF NOT EXISTS contribution_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create unique constraint to prevent duplicate memberships
ALTER TABLE team_members 
ADD CONSTRAINT unique_team_user_membership 
UNIQUE (team_id, user_id);

-- Create team invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invitee_email TEXT, -- for inviting users not yet registered
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'co_leader', 'developer', 'designer', 'pm', 'marketing', 'member')),
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Either invitee_id or invitee_email must be provided
  CONSTRAINT check_invitee CHECK (invitee_id IS NOT NULL OR invitee_email IS NOT NULL)
);

-- Create team projects table
CREATE TABLE IF NOT EXISTS team_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date DATE,
  github_repo TEXT,
  demo_url TEXT,
  published_project_id UUID, -- will link to published projects later
  assigned_members UUID[] DEFAULT '{}', -- array of user IDs
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team achievements table
CREATE TABLE IF NOT EXISTS team_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  icon TEXT,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team activity log for tracking team events
CREATE TABLE IF NOT EXISTS team_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL, -- 'member_joined', 'project_created', 'milestone_completed', etc.
  activity_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee_id ON team_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_invitee_email ON team_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_projects_team_id ON team_projects(team_id);
CREATE INDEX IF NOT EXISTS idx_team_achievements_team_id ON team_achievements(team_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_team_id ON team_activity(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);
CREATE INDEX IF NOT EXISTS idx_teams_project_type ON teams(project_type);

-- Create functions for team management

-- Function to get team member count
CREATE OR REPLACE FUNCTION get_team_member_count(team_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM team_members 
    WHERE team_id = team_uuid AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can join team
CREATE OR REPLACE FUNCTION can_user_join_team(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  team_max_members INTEGER;
  current_members INTEGER;
  team_status TEXT;
  is_already_member BOOLEAN;
BEGIN
  -- Get team info
  SELECT max_members, status INTO team_max_members, team_status
  FROM teams WHERE id = team_uuid;
  
  -- Check if user is already a member
  SELECT EXISTS(
    SELECT 1 FROM team_members 
    WHERE team_id = team_uuid AND user_id = user_uuid AND is_active = true
  ) INTO is_already_member;
  
  -- Get current member count
  current_members := get_team_member_count(team_uuid);
  
  -- Return true if team is recruiting, not full, and user is not already a member
  RETURN (
    team_status = 'recruiting' AND 
    current_members < team_max_members AND 
    NOT is_already_member
  );
END;
$$ LANGUAGE plpgsql;

-- Function to add team activity log
CREATE OR REPLACE FUNCTION log_team_activity(
  team_uuid UUID,
  user_uuid UUID,
  activity_type_param TEXT,
  activity_data_param JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO team_activity (team_id, user_id, activity_type, activity_data)
  VALUES (team_uuid, user_uuid, activity_type_param, activity_data_param);
END;
$$ LANGUAGE plpgsql;

-- Triggers to maintain data consistency

-- Update team XP when achievements are earned
CREATE OR REPLACE FUNCTION update_team_xp_on_achievement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE teams 
  SET total_xp = total_xp + NEW.xp_reward,
      updated_at = NOW()
  WHERE id = NEW.team_id;
  
  -- Log the achievement
  PERFORM log_team_activity(
    NEW.team_id, 
    NULL, 
    'achievement_earned', 
    jsonb_build_object('achievement_id', NEW.id, 'title', NEW.title, 'xp_reward', NEW.xp_reward)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_team_xp_on_achievement
  AFTER INSERT ON team_achievements
  FOR EACH ROW EXECUTE FUNCTION update_team_xp_on_achievement();

-- Log team member joins/leaves
CREATE OR REPLACE FUNCTION log_team_membership_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_team_activity(
      NEW.team_id, 
      NEW.user_id, 
      'member_joined', 
      jsonb_build_object('role', NEW.role)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
    PERFORM log_team_activity(
      NEW.team_id, 
      NEW.user_id, 
      'member_left', 
      jsonb_build_object('role', NEW.role)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_team_membership_changes
  AFTER INSERT OR UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION log_team_membership_changes();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_team_invitations_updated_at
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_team_projects_updated_at
  BEFORE UPDATE ON team_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


COMMENT ON TABLE teams IS 'Enhanced teams table supporting multiple membership, roles, and project tracking';
COMMENT ON TABLE team_members IS 'Junction table for team membership with roles and permissions';
COMMENT ON TABLE team_invitations IS 'Team invitation system supporting email and user invites';
COMMENT ON TABLE team_projects IS 'Team projects with progress tracking and milestones';
COMMENT ON TABLE team_achievements IS 'Team-based achievements and rewards system';
COMMENT ON TABLE team_activity IS 'Activity log for team events and member actions';

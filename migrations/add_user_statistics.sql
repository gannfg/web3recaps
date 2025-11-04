-- Migration: Add user_statistics table for efficient profile data
-- This table will store aggregated user statistics that are updated via triggers

CREATE TABLE public.user_statistics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Content Statistics
  total_posts integer DEFAULT 0,
  total_events_created integer DEFAULT 0,
  total_projects integer DEFAULT 0,
  total_teams_created integer DEFAULT 0,
  total_teams_joined integer DEFAULT 0,
  
  -- Engagement Statistics
  total_likes_received integer DEFAULT 0,
  total_comments_received integer DEFAULT 0,
  total_events_attended integer DEFAULT 0,
  
  -- Gamification Statistics
  total_xp integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  total_badges_earned integer DEFAULT 0,
  
  -- Activity Timestamps
  last_post_at timestamp with time zone,
  last_event_created_at timestamp with time zone,
  last_project_created_at timestamp with time zone,
  last_activity_at timestamp with time zone DEFAULT now(),
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT user_statistics_pkey PRIMARY KEY (id),
  CONSTRAINT user_statistics_user_id_unique UNIQUE (user_id)
);

-- Index for fast lookups
CREATE INDEX idx_user_statistics_user_id ON public.user_statistics(user_id);
CREATE INDEX idx_user_statistics_last_activity ON public.user_statistics(last_activity_at);

-- Enable RLS
ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own stats
CREATE POLICY "Users can view own statistics" ON public.user_statistics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own statistics" ON public.user_statistics
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to create user statistics record when user is created
CREATE OR REPLACE FUNCTION create_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_statistics (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create statistics when user is created
CREATE TRIGGER trigger_create_user_statistics
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_statistics();

-- Function to update statistics when posts are created/deleted
CREATE OR REPLACE FUNCTION update_post_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_statistics 
    SET 
      total_posts = total_posts + 1,
      last_post_at = NEW.created_at,
      last_activity_at = NEW.created_at,
      updated_at = now()
    WHERE user_id = NEW.author_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_statistics 
    SET 
      total_posts = GREATEST(total_posts - 1, 0),
      updated_at = now()
    WHERE user_id = OLD.author_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for posts
CREATE TRIGGER trigger_update_post_statistics
  AFTER INSERT OR DELETE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION update_post_statistics();

-- Function to update statistics when events are created/deleted
CREATE OR REPLACE FUNCTION update_event_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_statistics 
    SET 
      total_events_created = total_events_created + 1,
      last_event_created_at = NEW.created_at,
      last_activity_at = NEW.created_at,
      updated_at = now()
    WHERE user_id = NEW.creator_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_statistics 
    SET 
      total_events_created = GREATEST(total_events_created - 1, 0),
      updated_at = now()
    WHERE user_id = OLD.creator_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for events
CREATE TRIGGER trigger_update_event_statistics
  AFTER INSERT OR DELETE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_event_statistics();

-- Function to update statistics when projects are created/deleted
CREATE OR REPLACE FUNCTION update_project_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_statistics 
    SET 
      total_projects = total_projects + 1,
      last_project_created_at = NEW.created_at,
      last_activity_at = NEW.created_at,
      updated_at = now()
    WHERE user_id = NEW.created_by;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_statistics 
    SET 
      total_projects = GREATEST(total_projects - 1, 0),
      updated_at = now()
    WHERE user_id = OLD.created_by;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for projects
CREATE TRIGGER trigger_update_project_statistics
  AFTER INSERT OR DELETE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_statistics();

-- Function to update XP statistics
CREATE OR REPLACE FUNCTION update_xp_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_statistics 
    SET 
      total_xp = total_xp + NEW.xp_earned,
      last_activity_at = NEW.timestamp,
      updated_at = now()
    WHERE user_id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_statistics 
    SET 
      total_xp = GREATEST(total_xp - OLD.xp_earned, 0),
      updated_at = now()
    WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for XP transactions
CREATE TRIGGER trigger_update_xp_statistics
  AFTER INSERT OR DELETE ON public.xp_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_xp_statistics();

-- Function to update badge statistics
CREATE OR REPLACE FUNCTION update_badge_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.user_statistics 
    SET 
      total_badges_earned = total_badges_earned + 1,
      last_activity_at = NEW.unlocked_at,
      updated_at = now()
    WHERE user_id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_statistics 
    SET 
      total_badges_earned = GREATEST(total_badges_earned - 1, 0),
      updated_at = now()
    WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user badges
CREATE TRIGGER trigger_update_badge_statistics
  AFTER INSERT OR DELETE ON public.user_badges
  FOR EACH ROW
  EXECUTE FUNCTION update_badge_statistics();

-- Create statistics for existing users
INSERT INTO public.user_statistics (user_id, total_posts, total_events_created, total_projects, total_xp, total_badges_earned)
SELECT 
  u.id,
  COALESCE(p.post_count, 0),
  COALESCE(e.event_count, 0),
  COALESCE(pr.project_count, 0),
  COALESCE(u.total_xp, 0),
  COALESCE(ub.badge_count, 0)
FROM public.users u
LEFT JOIN (
  SELECT author_id, COUNT(*) as post_count 
  FROM public.posts 
  GROUP BY author_id
) p ON u.id = p.author_id
LEFT JOIN (
  SELECT creator_id, COUNT(*) as event_count 
  FROM public.events 
  GROUP BY creator_id
) e ON u.id = e.creator_id
LEFT JOIN (
  SELECT created_by, COUNT(*) as project_count 
  FROM public.projects 
  GROUP BY created_by
) pr ON u.id = pr.created_by
LEFT JOIN (
  SELECT user_id, COUNT(*) as badge_count 
  FROM public.user_badges 
  GROUP BY user_id
) ub ON u.id = ub.user_id
ON CONFLICT (user_id) DO NOTHING;

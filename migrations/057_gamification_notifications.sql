-- Migration: Add gamification notifications table for level up, rank up, and badge unlock events
-- This table stores gamification-specific notifications (separate from general notifications)

CREATE TABLE gamification_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'level_up', 'rank_up', 'badge_unlocked'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_gamification_notifications_user_id ON gamification_notifications(user_id);
CREATE INDEX idx_gamification_notifications_type ON gamification_notifications(type);
CREATE INDEX idx_gamification_notifications_read ON gamification_notifications(read);
CREATE INDEX idx_gamification_notifications_created_at ON gamification_notifications(created_at);
CREATE INDEX idx_gamification_notifications_user_unread ON gamification_notifications(user_id, read) WHERE read = FALSE;

-- Add RLS policies
ALTER TABLE gamification_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own gamification notifications
CREATE POLICY "Users can view own gamification notifications" ON gamification_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own gamification notifications (mark as read)
CREATE POLICY "Users can update own gamification notifications" ON gamification_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users cannot insert gamification notifications (system only)
CREATE POLICY "System can create gamification notifications" ON gamification_notifications
  FOR INSERT WITH CHECK (false);

-- Users cannot delete gamification notifications (system only)
CREATE POLICY "System can delete gamification notifications" ON gamification_notifications
  FOR DELETE USING (false);

-- Add function to create gamification notification
CREATE OR REPLACE FUNCTION create_gamification_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO gamification_notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Add function to get user gamification notifications with pagination
CREATE OR REPLACE FUNCTION get_user_gamification_notifications(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  type VARCHAR(50),
  title TEXT,
  message TEXT,
  data JSONB,
  read BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.user_id, n.type, n.title, n.message, n.data, n.read, n.created_at
  FROM gamification_notifications n
  WHERE n.user_id = p_user_id
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Add function to get unread gamification notification count
CREATE OR REPLACE FUNCTION get_unread_gamification_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM gamification_notifications
  WHERE user_id = p_user_id AND read = FALSE;
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Add function to mark all gamification notifications as read
CREATE OR REPLACE FUNCTION mark_all_gamification_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE gamification_notifications
  SET read = TRUE
  WHERE user_id = p_user_id AND read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Add function to clean up old gamification notifications
CREATE OR REPLACE FUNCTION cleanup_old_gamification_notifications(p_days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  cutoff_date := NOW() - INTERVAL '1 day' * p_days_old;
  
  DELETE FROM gamification_notifications
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up old gamification notifications (if using pg_cron)
-- This would be run daily to clean up old gamification notifications
-- SELECT cron.schedule('cleanup-gamification-notifications', '0 3 * * *', 'SELECT cleanup_old_gamification_notifications(30);');

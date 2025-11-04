-- Migration: Unified Notifications System
-- Consolidate all notifications into a single table with proper structure

-- First, extend the existing notifications table with new fields
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES users(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Update existing notifications to have read = false (since they were using read_at)
UPDATE notifications SET read = FALSE WHERE read_at IS NULL;

-- Migrate gamification_notifications data to main notifications table
INSERT INTO notifications (user_id, type, title, message, data, read, created_at)
SELECT user_id, type, title, message, data, read, created_at 
FROM gamification_notifications;

-- Drop the gamification_notifications table
DROP TABLE IF EXISTS gamification_notifications;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

-- Update RLS policies for the unified table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "System can delete notifications" ON notifications;

-- Create new unified policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- System can create notifications (for server-side operations)
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Add function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title TEXT,
  p_message TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, action_url, actor_id, entity_type, entity_id, data, read)
  VALUES (p_user_id, p_type, p_title, p_message, p_action_url, p_actor_id, p_entity_type, p_entity_id, p_data, FALSE)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Add function to get user notifications with pagination
CREATE OR REPLACE FUNCTION get_user_notifications(
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
  action_url TEXT,
  actor_id UUID,
  entity_type VARCHAR(50),
  entity_id UUID,
  data JSONB,
  read BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.user_id, n.type, n.title, n.message, n.action_url, n.actor_id, n.entity_type, n.entity_id, n.data, n.read, n.created_at
  FROM notifications n
  WHERE n.user_id = p_user_id
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Add function to get unread count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM notifications
  WHERE user_id = p_user_id AND read = FALSE;
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Add function to mark all as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET read = TRUE
  WHERE user_id = p_user_id AND read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Add function to mark single notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET read = TRUE
  WHERE id = p_notification_id AND user_id = p_user_id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Add function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  additional_deleted INTEGER;
BEGIN
  -- Delete read notifications older than 7 days
  DELETE FROM notifications
  WHERE read = TRUE 
    AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Also delete unread notifications older than 30 days
  DELETE FROM notifications
  WHERE read = FALSE 
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS additional_deleted = ROW_COUNT;
  deleted_count := deleted_count + additional_deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up old notifications (if using pg_cron)
-- This would be run daily to clean up old notifications
-- SELECT cron.schedule('cleanup-notifications', '0 3 * * *', 'SELECT cleanup_old_notifications();');

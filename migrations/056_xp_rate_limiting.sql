-- Migration: Add rate limiting for XP actions
-- This table tracks daily action limits to prevent XP farming

CREATE TABLE user_action_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  action_count INTEGER DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, action_type, date)
);

-- Create index for fast lookups
CREATE INDEX idx_user_action_limits_user_date ON user_action_limits(user_id, date);
CREATE INDEX idx_user_action_limits_action_type ON user_action_limits(action_type);

-- Add RLS policies
ALTER TABLE user_action_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own action limits
CREATE POLICY "Users can view own action limits" ON user_action_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Users cannot insert/update their own limits (system only)
CREATE POLICY "System can manage action limits" ON user_action_limits
  FOR ALL USING (false);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_action_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_action_limits_updated_at
  BEFORE UPDATE ON user_action_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_user_action_limits_updated_at();

-- Add function to increment action count
CREATE OR REPLACE FUNCTION increment_action_count(
  p_user_id UUID,
  p_action_type VARCHAR(50),
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO user_action_limits (user_id, action_type, date, action_count)
  VALUES (p_user_id, p_action_type, p_date, 1)
  ON CONFLICT (user_id, action_type, date)
  DO UPDATE SET 
    action_count = user_action_limits.action_count + 1,
    updated_at = NOW()
  RETURNING action_count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- Add function to get action count
CREATE OR REPLACE FUNCTION get_action_count(
  p_user_id UUID,
  p_action_type VARCHAR(50),
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COALESCE(action_count, 0) INTO count
  FROM user_action_limits
  WHERE user_id = p_user_id 
    AND action_type = p_action_type 
    AND date = p_date;
  
  RETURN COALESCE(count, 0);
END;
$$ LANGUAGE plpgsql;

-- Add function to reset daily limits (for cleanup)
CREATE OR REPLACE FUNCTION reset_daily_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_action_limits 
  WHERE date < CURRENT_DATE - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up old records (if using pg_cron)
-- This would be run daily to clean up old action limit records
-- SELECT cron.schedule('cleanup-action-limits', '0 2 * * *', 'SELECT reset_daily_limits();');

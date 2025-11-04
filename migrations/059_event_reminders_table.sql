-- Create event_reminders table for scheduling email reminders
CREATE TABLE IF NOT EXISTS event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  hours_before INTEGER NOT NULL CHECK (hours_before IN (24, 6)),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_reminders_event_id ON event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_scheduled_for ON event_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_event_reminders_status ON event_reminders(status);
CREATE INDEX IF NOT EXISTS idx_event_reminders_pending ON event_reminders(scheduled_for, status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Only system can manage reminders
CREATE POLICY "System can manage reminders" ON event_reminders
  FOR ALL USING (true);

-- Add function to clean up old reminders
CREATE OR REPLACE FUNCTION cleanup_old_event_reminders()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete reminders older than 30 days
  DELETE FROM event_reminders
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

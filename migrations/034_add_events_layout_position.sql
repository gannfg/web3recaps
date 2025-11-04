-- Add layout_position column to events table
-- This column will store the position of events in the newspaper-style layout

ALTER TABLE events 
ADD COLUMN layout_position VARCHAR(50);

-- Add index for better performance when filtering by layout position
CREATE INDEX idx_events_layout_position ON events(layout_position);

-- Add comment to explain the column
COMMENT ON COLUMN events.layout_position IS 'Position in the newspaper layout: event_main, event_left, event_right, event_secondary_1-3, or null for regular events';

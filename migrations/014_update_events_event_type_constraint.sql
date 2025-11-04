-- Update the event_type constraint to include new event types

-- Drop the existing constraint
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;

-- Add the new constraint with all event types
ALTER TABLE public.events ADD CONSTRAINT events_event_type_check 
CHECK (event_type = ANY (ARRAY[
  'workshop'::text, 
  '1on1'::text, 
  'study_group'::text, 
  'hackathon'::text,
  'meetup'::text,
  'conference'::text,
  'networking'::text
]));

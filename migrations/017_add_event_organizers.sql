-- Migration: Add event organizers system
-- This allows events to have multiple organizers (users and teams)

-- Create event_organizers table
CREATE TABLE public.event_organizers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  organizer_type text NOT NULL CHECK (organizer_type = ANY (ARRAY['user'::text, 'team'::text])),
  organizer_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'co_organizer'::text CHECK (role = ANY (ARRAY['primary'::text, 'secondary'::text, 'co_organizer'::text])),
  added_at timestamp with time zone DEFAULT now(),
  added_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_organizers_pkey PRIMARY KEY (id),
  CONSTRAINT event_organizers_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT event_organizers_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_event_organizers_event_id ON public.event_organizers(event_id);
CREATE INDEX idx_event_organizers_organizer_id ON public.event_organizers(organizer_id);
CREATE INDEX idx_event_organizers_type_id ON public.event_organizers(organizer_type, organizer_id);

-- Add unique constraint to prevent duplicate organizers for the same event
CREATE UNIQUE INDEX idx_event_organizers_unique ON public.event_organizers(event_id, organizer_type, organizer_id);

-- Update events table to support new event types
ALTER TABLE public.events 
DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE public.events 
ADD CONSTRAINT events_event_type_check 
CHECK (event_type = ANY (ARRAY[
  'marketing'::text, 
  'social'::text, 
  'workshop'::text, 
  '1on1'::text, 
  'study_group'::text, 
  'hackathon'::text, 
  'meetup'::text, 
  'conference'::text, 
  'networking'::text
]));

-- Create RLS policies for event_organizers
ALTER TABLE public.event_organizers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view organizers for public events or events they're involved in
CREATE POLICY "Users can view event organizers" ON public.event_organizers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = event_organizers.event_id 
      AND (e.is_public = true OR e.creator_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.event_organizers eo2 
      WHERE eo2.event_id = event_organizers.event_id 
      AND eo2.organizer_type = 'user' 
      AND eo2.organizer_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members tm 
      JOIN public.event_organizers eo3 ON eo3.organizer_id = tm.team_id 
      WHERE eo3.event_id = event_organizers.event_id 
      AND eo3.organizer_type = 'team' 
      AND tm.user_id = auth.uid()
    )
  );

-- Policy: Event creators can add/remove organizers
CREATE POLICY "Event creators can manage organizers" ON public.event_organizers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = event_organizers.event_id 
      AND e.creator_id = auth.uid()
    )
  );

-- Policy: Team members can manage organizers for their team events
CREATE POLICY "Team members can manage team organizers" ON public.event_organizers
  FOR ALL USING (
    organizer_type = 'team' AND
    EXISTS (
      SELECT 1 FROM public.team_members tm 
      WHERE tm.team_id = event_organizers.organizer_id 
      AND tm.user_id = auth.uid()
      AND tm.role IN ('leader', 'co_leader')
    )
  );

-- Add function to check if user can edit event
CREATE OR REPLACE FUNCTION can_edit_event(event_id uuid, user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    -- User is the creator
    SELECT 1 FROM public.events e WHERE e.id = event_id AND e.creator_id = user_id
  ) OR EXISTS (
    -- User is a primary organizer
    SELECT 1 FROM public.event_organizers eo 
    WHERE eo.event_id = event_id 
    AND eo.organizer_type = 'user' 
    AND eo.organizer_id = user_id
  ) OR EXISTS (
    -- User is a team member of an organizing team
    SELECT 1 FROM public.event_organizers eo 
    JOIN public.team_members tm ON tm.team_id = eo.organizer_id 
    WHERE eo.event_id = event_id 
    AND eo.organizer_type = 'team' 
    AND tm.user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

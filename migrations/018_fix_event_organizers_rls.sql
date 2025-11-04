-- Fix infinite recursion in event_organizers RLS policies
-- The current policies reference event_organizers within themselves, causing recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view event organizers" ON public.event_organizers;
DROP POLICY IF EXISTS "Event creators can manage organizers" ON public.event_organizers;
DROP POLICY IF EXISTS "Team members can manage organizers" ON public.event_organizers;

-- Create simplified, non-recursive policies

-- Policy: Anyone can read event organizers (since events are public)
CREATE POLICY "Allow read access to event organizers" ON public.event_organizers
  FOR SELECT USING (true);

-- Policy: Event creators can manage organizers
CREATE POLICY "Event creators can manage organizers" ON public.event_organizers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = event_organizers.event_id 
      AND e.creator_id = auth.uid()
    )
  );

-- Policy: Team members of organizing teams can manage organizers
CREATE POLICY "Team members can manage organizers" ON public.event_organizers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = event_organizers.organizer_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND event_organizers.organizer_type = 'team'
    )
  );

-- Verify the policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'event_organizers';

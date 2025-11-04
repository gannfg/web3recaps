-- Fix event_organizers INSERT policy to allow authenticated users to add organizers
-- The current policies are too restrictive for inserting new organizers

-- Drop the existing ALL policies that are causing issues
DROP POLICY IF EXISTS "Event creators can manage organizers" ON public.event_organizers;
DROP POLICY IF EXISTS "Team members can manage organizers" ON public.event_organizers;
DROP POLICY IF EXISTS "Team members can manage team organizers" ON public.event_organizers;

-- Create separate policies for different operations

-- Policy: Anyone can read event organizers (since events are public)
-- (This one is already working, keeping it)

-- Policy: Event creators can insert/update/delete organizers
CREATE POLICY "Event creators can manage organizers" ON public.event_organizers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = event_organizers.event_id 
      AND e.creator_id = auth.uid()
    )
  );

-- Policy: Team members can manage organizers for their teams
CREATE POLICY "Team members can manage team organizers" ON public.event_organizers
  FOR ALL USING (
    event_organizers.organizer_type = 'team' AND
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = event_organizers.organizer_id
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
    )
  );

-- Policy: Allow authenticated users to insert organizers (for event creation)
CREATE POLICY "Authenticated users can insert organizers" ON public.event_organizers
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    (
      -- Event creator can add organizers
      EXISTS (
        SELECT 1 FROM public.events e 
        WHERE e.id = event_organizers.event_id 
        AND e.creator_id = auth.uid()
      ) OR
      -- Team members can add organizers for their teams
      (
        event_organizers.organizer_type = 'team' AND
        EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.team_id = event_organizers.organizer_id
          AND tm.user_id = auth.uid()
          AND tm.is_active = true
        )
      )
    )
  );

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'event_organizers'
ORDER BY policyname;

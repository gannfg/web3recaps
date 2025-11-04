-- Remove the conflicting ALL policies that are blocking INSERT
-- The ALL policies are overriding the specific INSERT policy

-- Drop the conflicting ALL policies
DROP POLICY IF EXISTS "Event creators can manage organizers" ON public.event_organizers;
DROP POLICY IF EXISTS "Team members can manage team organizers" ON public.event_organizers;

-- Keep only the specific policies that work
-- (The INSERT, UPDATE, DELETE, and SELECT policies are already correct)

-- Verify the policies after cleanup
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'event_organizers'
ORDER BY policyname;

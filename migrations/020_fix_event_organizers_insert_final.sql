-- Fix event_organizers INSERT policy - make it more permissive for authenticated users
-- The current policy is still too restrictive

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert organizers" ON public.event_organizers;

-- Create a more permissive INSERT policy
-- Allow any authenticated user to insert organizers (we'll handle permissions at the application level)
CREATE POLICY "Allow authenticated users to insert organizers" ON public.event_organizers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Also create a simple UPDATE policy for authenticated users
CREATE POLICY "Allow authenticated users to update organizers" ON public.event_organizers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- And a DELETE policy for authenticated users
CREATE POLICY "Allow authenticated users to delete organizers" ON public.event_organizers
  FOR DELETE USING (auth.role() = 'authenticated');

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'event_organizers'
ORDER BY policyname;

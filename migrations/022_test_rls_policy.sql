-- Test the RLS policy to see what's happening
-- Let's check if the policy is working correctly

-- First, let's see what the current user context is
SELECT auth.uid() as current_user_id, auth.role() as current_role;

-- Let's check if there are any existing event_organizers
SELECT COUNT(*) as total_organizers FROM event_organizers;

-- Let's check the current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'event_organizers'
ORDER BY policyname;

-- Let's try to insert a test record to see what happens
-- (This will fail if RLS is blocking it)
INSERT INTO event_organizers (
  event_id, 
  organizer_type, 
  organizer_id, 
  role, 
  added_by, 
  added_at
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'team',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'co_organizer',
  '00000000-0000-0000-0000-000000000000'::uuid,
  now()
);

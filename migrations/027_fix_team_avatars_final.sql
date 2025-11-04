-- Final fix for team-avatars storage bucket
-- Drop all existing team-avatars policies to start fresh
DROP POLICY IF EXISTS "Team avatars - allow all authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Team Avatars Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Team avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Team leaders can upload team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Team leaders can update team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Team leaders can delete team avatars" ON storage.objects;

-- Create simple, working policies
CREATE POLICY "Team avatars - simple upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'team-avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Team avatars - simple select" ON storage.objects
FOR SELECT USING (bucket_id = 'team-avatars');

CREATE POLICY "Team avatars - simple update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'team-avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Team avatars - simple delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'team-avatars' 
  AND auth.role() = 'authenticated'
);

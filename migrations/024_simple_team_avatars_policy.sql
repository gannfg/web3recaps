-- Simple fix for team-avatars storage bucket
-- First ensure the bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-avatars',
  'team-avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop all existing policies for team-avatars
DROP POLICY IF EXISTS "Users can upload team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete team avatars" ON storage.objects;

-- Create a simple policy that allows all authenticated users to upload to team-avatars
-- This is temporary - we can make it more restrictive later
CREATE POLICY "Allow authenticated users to upload team avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'team-avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow public access to team avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'team-avatars');

CREATE POLICY "Allow authenticated users to update team avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'team-avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to delete team avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'team-avatars' 
  AND auth.role() = 'authenticated'
);

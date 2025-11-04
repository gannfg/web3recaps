-- Simple fix for team-avatars storage bucket
-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-avatars',
  'team-avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop ALL existing policies for team-avatars to start fresh
DROP POLICY IF EXISTS "Users can upload team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete team avatars" ON storage.objects;

-- Create very simple policies that allow all authenticated users
-- We can make this more restrictive later once it's working
CREATE POLICY "Team avatars - allow all authenticated users" ON storage.objects
FOR ALL USING (
  bucket_id = 'team-avatars' 
  AND auth.role() = 'authenticated'
);

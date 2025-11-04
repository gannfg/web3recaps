-- Fix RLS policies for team-avatars storage bucket
-- Allow authenticated users to upload team avatars if they have team permissions

-- First, let's check if the bucket exists and create it if it doesn't
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-avatars',
  'team-avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update team avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete team avatars" ON storage.objects;

-- Create new policies for team-avatars bucket
CREATE POLICY "Users can upload team avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'team-avatars' 
  AND auth.role() = 'authenticated'
  AND (
    -- User is team creator
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id::text = (storage.foldername(name))[1] 
      AND created_by = auth.uid()
    )
    OR
    -- User is team leader/co-leader
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE t.id::text = (storage.foldername(name))[1]
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.role IN ('leader', 'co_leader')
    )
  )
);

CREATE POLICY "Users can view team avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'team-avatars');

CREATE POLICY "Users can update team avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'team-avatars' 
  AND auth.role() = 'authenticated'
  AND (
    -- User is team creator
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id::text = (storage.foldername(name))[1] 
      AND created_by = auth.uid()
    )
    OR
    -- User is team leader/co-leader
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE t.id::text = (storage.foldername(name))[1]
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.role IN ('leader', 'co_leader')
    )
  )
);

CREATE POLICY "Users can delete team avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'team-avatars' 
  AND auth.role() = 'authenticated'
  AND (
    -- User is team creator
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id::text = (storage.foldername(name))[1] 
      AND created_by = auth.uid()
    )
    OR
    -- User is team leader/co-leader
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE t.id::text = (storage.foldername(name))[1]
      AND tm.user_id = auth.uid()
      AND tm.is_active = true
      AND tm.role IN ('leader', 'co_leader')
    )
  )
);

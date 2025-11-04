-- Verify team-avatars bucket exists and is accessible
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'team-avatars';

-- If it doesn't exist, create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-avatars',
  'team-avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Check RLS policies for the bucket
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';

-- Test if we can insert a simple object (this will fail if RLS is blocking)
-- This is just to test - we'll delete it immediately
INSERT INTO storage.objects (bucket_id, name, metadata, owner)
VALUES ('team-avatars', 'test-file.txt', '{}', auth.uid())
ON CONFLICT DO NOTHING;

-- Delete the test file
DELETE FROM storage.objects WHERE bucket_id = 'team-avatars' AND name = 'test-file.txt';

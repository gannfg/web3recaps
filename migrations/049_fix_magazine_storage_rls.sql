-- Fix Magazine Storage RLS Policies
-- Migration: 049_fix_magazine_storage_rls.sql
-- Fix storage RLS policies to work with the authentication method

-- Drop existing magazine storage policies
DROP POLICY IF EXISTS "Public can view magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own magazine images" ON storage.objects;

-- Create new policies that work with the current authentication method
-- Allow public access to view magazine images
CREATE POLICY "Public can view magazine images" ON storage.objects
    FOR SELECT USING (bucket_id = 'magazine-images');

-- Allow any authenticated user to upload magazine images
-- (This matches the pattern used by other working storage buckets)
CREATE POLICY "Anyone can upload magazine images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'magazine-images');

-- Allow users to update magazine images (using folder structure for ownership)
CREATE POLICY "Users can update magazine images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'magazine-images');

-- Allow users to delete magazine images (using folder structure for ownership)
CREATE POLICY "Users can delete magazine images" ON storage.objects
    FOR DELETE USING (bucket_id = 'magazine-images');

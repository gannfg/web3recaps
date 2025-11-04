-- Create magazine images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'magazine-images',
    'magazine-images',
    true,
    10485760, -- 10MB limit for high-quality A4 images
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
);

-- Create RLS policies for magazine images bucket
CREATE POLICY "Public can view magazine images" ON storage.objects
    FOR SELECT USING (bucket_id = 'magazine-images');

CREATE POLICY "Authenticated users can upload magazine images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'magazine-images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own magazine images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'magazine-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own magazine images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'magazine-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Note: Admin and Author policies are created in 042_add_author_permissions.sql

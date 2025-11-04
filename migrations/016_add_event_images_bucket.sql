-- Add event-images storage bucket

-- Create the event-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for event-images bucket
CREATE POLICY "Public read access for event images" ON storage.objects
FOR SELECT USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can upload event images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own event images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own event images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

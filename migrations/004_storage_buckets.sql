-- Storage Buckets Migration
-- Create buckets for teams, projects, and user content

-- Create storage buckets using the storage schema
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  -- Team avatars and banners
  ('team-avatars', 'team-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('team-banners', 'team-banners', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  
  -- Project media
  ('project-banners', 'project-banners', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('project-logos', 'project-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('project-screenshots', 'project-screenshots', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('project-videos', 'project-videos', true, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
  
  -- User avatars (if not already exists)
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for team avatars
CREATE POLICY "Team avatars are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'team-avatars');

CREATE POLICY "Team leaders can upload team avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'team-avatars' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
      AND (tm.role IN ('leader', 'co_leader') OR t.created_by = auth.uid())
      AND (storage.foldername(name))[1] = t.id::text
    )
  );

CREATE POLICY "Team leaders can update team avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'team-avatars' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
      AND (tm.role IN ('leader', 'co_leader') OR t.created_by = auth.uid())
      AND (storage.foldername(name))[1] = t.id::text
    )
  );

CREATE POLICY "Team leaders can delete team avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'team-avatars' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
      AND (tm.role IN ('leader', 'co_leader') OR t.created_by = auth.uid())
      AND (storage.foldername(name))[1] = t.id::text
    )
  );

-- Create storage policies for team banners
CREATE POLICY "Team banners are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'team-banners');

CREATE POLICY "Team leaders can upload team banners" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'team-banners' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
      AND (tm.role IN ('leader', 'co_leader') OR t.created_by = auth.uid())
      AND (storage.foldername(name))[1] = t.id::text
    )
  );

CREATE POLICY "Team leaders can update team banners" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'team-banners' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
      AND (tm.role IN ('leader', 'co_leader') OR t.created_by = auth.uid())
      AND (storage.foldername(name))[1] = t.id::text
    )
  );

CREATE POLICY "Team leaders can delete team banners" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'team-banners' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
      AND (tm.role IN ('leader', 'co_leader') OR t.created_by = auth.uid())
      AND (storage.foldername(name))[1] = t.id::text
    )
  );

-- Create storage policies for project banners
CREATE POLICY "Project banners are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-banners');

CREATE POLICY "Project contributors can upload project banners" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-banners' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_contributors pc ON p.id = pc.project_id
      LEFT JOIN team_members tm ON p.team_id = tm.team_id
      WHERE (
        p.created_by = auth.uid() OR
        (pc.user_id = auth.uid() AND pc.is_active = true AND pc.role IN ('lead', 'developer', 'designer', 'pm')) OR
        (tm.user_id = auth.uid() AND tm.is_active = true AND tm.role IN ('leader', 'co_leader', 'pm'))
      )
      AND (storage.foldername(name))[1] = p.id::text
    )
  );

CREATE POLICY "Project contributors can update project banners" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-banners' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_contributors pc ON p.id = pc.project_id
      LEFT JOIN team_members tm ON p.team_id = tm.team_id
      WHERE (
        p.created_by = auth.uid() OR
        (pc.user_id = auth.uid() AND pc.is_active = true AND pc.role IN ('lead', 'developer', 'designer', 'pm')) OR
        (tm.user_id = auth.uid() AND tm.is_active = true AND tm.role IN ('leader', 'co_leader', 'pm'))
      )
      AND (storage.foldername(name))[1] = p.id::text
    )
  );

CREATE POLICY "Project contributors can delete project banners" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-banners' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_contributors pc ON p.id = pc.project_id
      LEFT JOIN team_members tm ON p.team_id = tm.team_id
      WHERE (
        p.created_by = auth.uid() OR
        (pc.user_id = auth.uid() AND pc.is_active = true AND pc.role IN ('lead', 'developer', 'designer', 'pm')) OR
        (tm.user_id = auth.uid() AND tm.is_active = true AND tm.role IN ('leader', 'co_leader', 'pm'))
      )
      AND (storage.foldername(name))[1] = p.id::text
    )
  );

-- Create storage policies for project logos
CREATE POLICY "Project logos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-logos');

CREATE POLICY "Project contributors can upload project logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-logos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_contributors pc ON p.id = pc.project_id
      LEFT JOIN team_members tm ON p.team_id = tm.team_id
      WHERE (
        p.created_by = auth.uid() OR
        (pc.user_id = auth.uid() AND pc.is_active = true AND pc.role IN ('lead', 'developer', 'designer', 'pm')) OR
        (tm.user_id = auth.uid() AND tm.is_active = true AND tm.role IN ('leader', 'co_leader', 'pm'))
      )
      AND (storage.foldername(name))[1] = p.id::text
    )
  );

CREATE POLICY "Project contributors can update project logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-logos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_contributors pc ON p.id = pc.project_id
      LEFT JOIN team_members tm ON p.team_id = tm.team_id
      WHERE (
        p.created_by = auth.uid() OR
        (pc.user_id = auth.uid() AND pc.is_active = true AND pc.role IN ('lead', 'developer', 'designer', 'pm')) OR
        (tm.user_id = auth.uid() AND tm.is_active = true AND tm.role IN ('leader', 'co_leader', 'pm'))
      )
      AND (storage.foldername(name))[1] = p.id::text
    )
  );

CREATE POLICY "Project contributors can delete project logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-logos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_contributors pc ON p.id = pc.project_id
      LEFT JOIN team_members tm ON p.team_id = tm.team_id
      WHERE (
        p.created_by = auth.uid() OR
        (pc.user_id = auth.uid() AND pc.is_active = true AND pc.role IN ('lead', 'developer', 'designer', 'pm')) OR
        (tm.user_id = auth.uid() AND tm.is_active = true AND tm.role IN ('leader', 'co_leader', 'pm'))
      )
      AND (storage.foldername(name))[1] = p.id::text
    )
  );

-- Create storage policies for project screenshots
CREATE POLICY "Project screenshots are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-screenshots');

CREATE POLICY "Project contributors can upload screenshots" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-screenshots' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_contributors pc ON p.id = pc.project_id
      LEFT JOIN team_members tm ON p.team_id = tm.team_id
      WHERE (
        p.created_by = auth.uid() OR
        (pc.user_id = auth.uid() AND pc.is_active = true) OR
        (tm.user_id = auth.uid() AND tm.is_active = true)
      )
      AND (storage.foldername(name))[1] = p.id::text
    )
  );

CREATE POLICY "Project contributors can update screenshots" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-screenshots' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_contributors pc ON p.id = pc.project_id
      LEFT JOIN team_members tm ON p.team_id = tm.team_id
      WHERE (
        p.created_by = auth.uid() OR
        (pc.user_id = auth.uid() AND pc.is_active = true) OR
        (tm.user_id = auth.uid() AND tm.is_active = true)
      )
      AND (storage.foldername(name))[1] = p.id::text
    )
  );

CREATE POLICY "Project contributors can delete screenshots" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-screenshots' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_contributors pc ON p.id = pc.project_id
      LEFT JOIN team_members tm ON p.team_id = tm.team_id
      WHERE (
        p.created_by = auth.uid() OR
        (pc.user_id = auth.uid() AND pc.is_active = true) OR
        (tm.user_id = auth.uid() AND tm.is_active = true)
      )
      AND (storage.foldername(name))[1] = p.id::text
    )
  );

-- Create storage policies for project videos
CREATE POLICY "Project videos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-videos');

CREATE POLICY "Project contributors can upload videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-videos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_contributors pc ON p.id = pc.project_id
      LEFT JOIN team_members tm ON p.team_id = tm.team_id
      WHERE (
        p.created_by = auth.uid() OR
        (pc.user_id = auth.uid() AND pc.is_active = true) OR
        (tm.user_id = auth.uid() AND tm.is_active = true)
      )
      AND (storage.foldername(name))[1] = p.id::text
    )
  );

CREATE POLICY "Project contributors can update videos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-videos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_contributors pc ON p.id = pc.project_id
      LEFT JOIN team_members tm ON p.team_id = tm.team_id
      WHERE (
        p.created_by = auth.uid() OR
        (pc.user_id = auth.uid() AND pc.is_active = true) OR
        (tm.user_id = auth.uid() AND tm.is_active = true)
      )
      AND (storage.foldername(name))[1] = p.id::text
    )
  );

CREATE POLICY "Project contributors can delete videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-videos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN project_contributors pc ON p.id = pc.project_id
      LEFT JOIN team_members tm ON p.team_id = tm.team_id
      WHERE (
        p.created_by = auth.uid() OR
        (pc.user_id = auth.uid() AND pc.is_active = true) OR
        (tm.user_id = auth.uid() AND tm.is_active = true)
      )
      AND (storage.foldername(name))[1] = p.id::text
    )
  );

-- Create storage policies for user avatars (if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Avatar images are publicly accessible'
  ) THEN
    CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can upload their own avatar'
  ) THEN
    CREATE POLICY "Users can upload their own avatar" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid() IS NOT NULL AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can update their own avatar'
  ) THEN
    CREATE POLICY "Users can update their own avatar" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'avatars' AND
        auth.uid() IS NOT NULL AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Users can delete their own avatar'
  ) THEN
    CREATE POLICY "Users can delete their own avatar" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'avatars' AND
        auth.uid() IS NOT NULL AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- Create helper function to get file extension
CREATE OR REPLACE FUNCTION get_file_extension(filename text)
RETURNS text AS $$
BEGIN
  RETURN lower(substring(filename from '\.([^.]*)$'));
END;
$$ LANGUAGE plpgsql;

-- Create helper function to generate unique filename
CREATE OR REPLACE FUNCTION generate_unique_filename(original_filename text, folder_path text DEFAULT '')
RETURNS text AS $$
DECLARE
  extension text;
  base_name text;
  timestamp_str text;
  unique_filename text;
BEGIN
  extension := get_file_extension(original_filename);
  base_name := substring(original_filename from '^(.*)\..*$');
  timestamp_str := extract(epoch from now())::bigint::text;
  
  IF folder_path = '' THEN
    unique_filename := base_name || '_' || timestamp_str || '.' || extension;
  ELSE
    unique_filename := folder_path || '/' || base_name || '_' || timestamp_str || '.' || extension;
  END IF;
  
  RETURN unique_filename;
END;
$$ LANGUAGE plpgsql;
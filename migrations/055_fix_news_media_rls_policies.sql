-- Fix News Media RLS Policies
-- Update policies to accept both uppercase and title case roles (ADMIN/Admin, AUTHOR/Author)

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can insert news media" ON news_media;
DROP POLICY IF EXISTS "Users can update their own news media" ON news_media;
DROP POLICY IF EXISTS "Users can delete their own news media" ON news_media;

-- Enable RLS if not already enabled
ALTER TABLE news_media ENABLE ROW LEVEL SECURITY;

-- Policy for inserting news media (accepts ADMIN, AUTHOR, Admin, Author)
CREATE POLICY "Authenticated users can insert news media" ON news_media
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (u.role::text IN ('ADMIN', 'AUTHOR', 'Admin', 'Author') 
           OR UPPER(u.role::text) IN ('ADMIN', 'AUTHOR'))
    )
  );

-- Policy for updating news media
CREATE POLICY "Users can update their own news media" ON news_media
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (u.role::text IN ('ADMIN', 'AUTHOR', 'Admin', 'Author') 
           OR UPPER(u.role::text) IN ('ADMIN', 'AUTHOR'))
    )
  );

-- Policy for deleting news media
CREATE POLICY "Users can delete their own news media" ON news_media
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (u.role::text IN ('ADMIN', 'AUTHOR', 'Admin', 'Author') 
           OR UPPER(u.role::text) IN ('ADMIN', 'AUTHOR'))
    )
  );














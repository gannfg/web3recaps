-- Cleanup Magazine RLS Mess
-- Migration: 047_cleanup_magazine_rls_mess.sql
-- Clean up all the conflicting policies and re-enable RLS properly

-- First, re-enable RLS (in case 046 was applied)
ALTER TABLE magazines ENABLE ROW LEVEL SECURITY;
ALTER TABLE magazine_pages ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing magazine policies to start clean
DROP POLICY IF EXISTS "Public can view published magazines" ON magazines;
DROP POLICY IF EXISTS "Admins and Authors can manage all magazines" ON magazines;
DROP POLICY IF EXISTS "Admins and Builders can manage all magazines" ON magazines;
DROP POLICY IF EXISTS "Users can view their own draft magazines" ON magazines;
DROP POLICY IF EXISTS "Admins and Authors can create magazines" ON magazines;
DROP POLICY IF EXISTS "Authenticated users can create magazines" ON magazines;
DROP POLICY IF EXISTS "Users can update their own magazines" ON magazines;
DROP POLICY IF EXISTS "Users can delete their own magazines" ON magazines;
DROP POLICY IF EXISTS "Anyone can read published magazines" ON magazines;
DROP POLICY IF EXISTS "Users can read their own magazines" ON magazines;

-- Drop ALL existing magazine_pages policies
DROP POLICY IF EXISTS "Public can view pages of published magazines" ON magazine_pages;
DROP POLICY IF EXISTS "Admins and Authors can manage all magazine pages" ON magazine_pages;
DROP POLICY IF EXISTS "Admins and Builders can manage all magazine pages" ON magazine_pages;
DROP POLICY IF EXISTS "Users can manage pages of their magazines" ON magazine_pages;
DROP POLICY IF EXISTS "Users can create pages for their magazines" ON magazine_pages;
DROP POLICY IF EXISTS "Anyone can read pages of published magazines" ON magazine_pages;
DROP POLICY IF EXISTS "Users can read pages of their magazines" ON magazine_pages;
DROP POLICY IF EXISTS "Users can update pages of their magazines" ON magazine_pages;
DROP POLICY IF EXISTS "Users can delete pages of their magazines" ON magazine_pages;

-- Create clean, working policies for magazines
CREATE POLICY "Anyone can read published magazines" ON magazines
  FOR SELECT USING (status = 'published');

CREATE POLICY "Users can read their own magazines" ON magazines
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create magazines" ON magazines
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own magazines" ON magazines
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own magazines" ON magazines
  FOR DELETE USING (auth.uid() = created_by);

CREATE POLICY "Admins and Builders can manage all magazines" ON magazines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'BUILDER')
    )
  );

-- Create clean, working policies for magazine_pages
CREATE POLICY "Anyone can read pages of published magazines" ON magazine_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM magazines 
      WHERE magazines.id = magazine_pages.magazine_id 
      AND magazines.status = 'published'
    )
  );

CREATE POLICY "Users can read pages of their magazines" ON magazine_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM magazines 
      WHERE magazines.id = magazine_pages.magazine_id 
      AND magazines.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create pages for their magazines" ON magazine_pages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM magazines 
      WHERE magazines.id = magazine_pages.magazine_id 
      AND magazines.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update pages of their magazines" ON magazine_pages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM magazines 
      WHERE magazines.id = magazine_pages.magazine_id 
      AND magazines.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete pages of their magazines" ON magazine_pages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM magazines 
      WHERE magazines.id = magazine_pages.magazine_id 
      AND magazines.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins and Builders can manage all magazine pages" ON magazine_pages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ADMIN', 'BUILDER')
    )
  );

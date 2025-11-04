-- Fix Magazine RLS Auth Context
-- Migration: 048_fix_magazine_rls_auth_context.sql
-- Disable RLS for magazines tables to match news_articles pattern

-- Disable RLS for magazines table (like news_articles)
ALTER TABLE magazines DISABLE ROW LEVEL SECURITY;

-- Disable RLS for magazine_pages table
ALTER TABLE magazine_pages DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies since RLS is disabled
DROP POLICY IF EXISTS "Anyone can read published magazines" ON magazines;
DROP POLICY IF EXISTS "Users can read their own magazines" ON magazines;
DROP POLICY IF EXISTS "Authenticated users can create magazines" ON magazines;
DROP POLICY IF EXISTS "Users can update their own magazines" ON magazines;
DROP POLICY IF EXISTS "Users can delete their own magazines" ON magazines;
DROP POLICY IF EXISTS "Admins and Builders can manage all magazines" ON magazines;

DROP POLICY IF EXISTS "Anyone can read pages of published magazines" ON magazine_pages;
DROP POLICY IF EXISTS "Users can read pages of their magazines" ON magazine_pages;
DROP POLICY IF EXISTS "Users can create pages for their magazines" ON magazine_pages;
DROP POLICY IF EXISTS "Users can update pages of their magazines" ON magazine_pages;
DROP POLICY IF EXISTS "Users can delete pages of their magazines" ON magazine_pages;
DROP POLICY IF EXISTS "Admins and Builders can manage all magazine pages" ON magazine_pages;

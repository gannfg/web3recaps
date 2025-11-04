-- Create page_views table to track page visits
CREATE TABLE IF NOT EXISTS page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries by page path
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);

-- Enable RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert page views (for tracking)
CREATE POLICY "Allow public to insert page views" ON page_views
  FOR INSERT WITH CHECK (true);

-- Allow anyone to read page views (for displaying counts)
CREATE POLICY "Allow public to read page views" ON page_views
  FOR SELECT USING (true);

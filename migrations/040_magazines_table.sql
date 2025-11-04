-- Create magazines table for monthly magazine issues
CREATE TABLE IF NOT EXISTS magazines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    issue_number INTEGER NOT NULL,
    issue_date DATE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    cover_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    UNIQUE(issue_number, issue_date)
);

-- Create magazine_pages table for individual pages
CREATE TABLE IF NOT EXISTS magazine_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    magazine_id UUID REFERENCES magazines(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    page_title TEXT,
    image_url TEXT NOT NULL,
    page_type TEXT DEFAULT 'content' CHECK (page_type IN ('cover', 'content', 'back_cover')),
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(magazine_id, page_number),
    UNIQUE(magazine_id, sort_order)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_magazines_issue_date ON magazines(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_magazines_status ON magazines(status);
CREATE INDEX IF NOT EXISTS idx_magazine_pages_magazine_id ON magazine_pages(magazine_id);
CREATE INDEX IF NOT EXISTS idx_magazine_pages_sort_order ON magazine_pages(magazine_id, sort_order);

-- Enable RLS
ALTER TABLE magazines ENABLE ROW LEVEL SECURITY;
ALTER TABLE magazine_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for magazines
CREATE POLICY "Public can view published magazines" ON magazines
    FOR SELECT USING (status = 'published');

CREATE POLICY "Admins and Authors can manage all magazines" ON magazines
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('Admin', 'Builder')
        )
    );

CREATE POLICY "Users can view their own draft magazines" ON magazines
    FOR SELECT USING (
        created_by = auth.uid() OR status = 'published'
    );

CREATE POLICY "Admins and Authors can create magazines" ON magazines
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('Admin', 'Builder')
        )
    );

CREATE POLICY "Users can update their own magazines" ON magazines
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('Admin', 'Builder')
        )
    );

CREATE POLICY "Users can delete their own magazines" ON magazines
    FOR DELETE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('Admin', 'Builder')
        )
    );

-- RLS Policies for magazine_pages
CREATE POLICY "Public can view pages of published magazines" ON magazine_pages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM magazines 
            WHERE magazines.id = magazine_pages.magazine_id 
            AND magazines.status = 'published'
        )
    );

CREATE POLICY "Admins and Authors can manage all magazine pages" ON magazine_pages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('Admin', 'Builder')
        )
    );

CREATE POLICY "Users can manage pages of their magazines" ON magazine_pages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM magazines 
            WHERE magazines.id = magazine_pages.magazine_id 
            AND (
                magazines.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_roles.user_id = auth.uid() 
                    AND user_roles.role IN ('Admin', 'Builder')
                )
            )
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_magazines_updated_at BEFORE UPDATE ON magazines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_magazine_pages_updated_at BEFORE UPDATE ON magazine_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- No sample data - magazines and pages will be created through the frontend

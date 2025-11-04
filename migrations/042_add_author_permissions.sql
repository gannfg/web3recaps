-- Add Author role to existing magazine policies

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all magazines" ON magazines;
DROP POLICY IF EXISTS "Users can create magazines" ON magazines;
DROP POLICY IF EXISTS "Users can update their own magazines" ON magazines;
DROP POLICY IF EXISTS "Users can delete their own magazines" ON magazines;
DROP POLICY IF EXISTS "Admins can manage all magazine pages" ON magazine_pages;
DROP POLICY IF EXISTS "Users can manage pages of their magazines" ON magazine_pages;

-- Recreate policies with Author role included
CREATE POLICY "Admins and Authors can manage all magazines" ON magazines
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('Admin', 'Builder')
        )
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

CREATE POLICY "Admins and Authors can manage all magazine images" ON storage.objects
    FOR ALL USING (
        bucket_id = 'magazine-images' 
        AND EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('Admin', 'Builder')
        )
    );

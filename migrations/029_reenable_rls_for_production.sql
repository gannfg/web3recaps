-- Re-enable RLS for production
-- This migration restores proper security after testing

-- Re-enable RLS on news tables
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_article_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_article_bookmarks ENABLE ROW LEVEL SECURITY;

-- Drop the permissive testing policies
DROP POLICY IF EXISTS "Authenticated users can create articles" ON public.news_articles;
DROP POLICY IF EXISTS "Anyone can read published articles" ON public.news_articles;
DROP POLICY IF EXISTS "Users can read their own articles" ON public.news_articles;
DROP POLICY IF EXISTS "Users can update their own articles" ON public.news_articles;
DROP POLICY IF EXISTS "Users can delete their own articles" ON public.news_articles;
DROP POLICY IF EXISTS "Admins can manage all articles" ON public.news_articles;
DROP POLICY IF EXISTS "Authenticated users can manage reactions" ON public.news_article_reactions;
DROP POLICY IF EXISTS "Anyone can read reactions" ON public.news_article_reactions;
DROP POLICY IF EXISTS "Authenticated users can manage comments" ON public.news_article_comments;
DROP POLICY IF EXISTS "Anyone can read comments" ON public.news_article_comments;
DROP POLICY IF EXISTS "Authenticated users can manage bookmarks" ON public.news_article_bookmarks;
DROP POLICY IF EXISTS "Anyone can read bookmarks" ON public.news_article_bookmarks;

-- Create proper production RLS policies
-- Only published articles are publicly readable
CREATE POLICY "Anyone can read published articles" ON public.news_articles
    FOR SELECT USING (status = 'published');

-- Authors can manage their own articles
CREATE POLICY "Authors can manage their own articles" ON public.news_articles
    FOR ALL USING (auth.uid() = author_id);

-- Admins can manage all articles
CREATE POLICY "Admins can manage all articles" ON public.news_articles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'Admin'
        )
    );

-- Authenticated users can manage their own reactions
CREATE POLICY "Users can manage their own reactions" ON public.news_article_reactions
    FOR ALL USING (auth.uid() = user_id);

-- Anyone can read reactions on published articles
CREATE POLICY "Anyone can read reactions on published articles" ON public.news_article_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.news_articles 
            WHERE id = article_id AND status = 'published'
        )
    );

-- Authenticated users can manage their own comments
CREATE POLICY "Users can manage their own comments" ON public.news_article_comments
    FOR ALL USING (auth.uid() = user_id);

-- Anyone can read comments on published articles
CREATE POLICY "Anyone can read comments on published articles" ON public.news_article_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.news_articles 
            WHERE id = article_id AND status = 'published'
        )
    );

-- Users can manage their own bookmarks
CREATE POLICY "Users can manage their own bookmarks" ON public.news_article_bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- Users can read their own bookmarks
CREATE POLICY "Users can read their own bookmarks" ON public.news_article_bookmarks
    FOR SELECT USING (auth.uid() = user_id);

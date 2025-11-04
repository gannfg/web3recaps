-- Disable RLS on news tables to be consistent with the rest of the app
-- The app handles permissions at the application layer, not database level

ALTER TABLE public.news_articles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_article_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_article_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_article_bookmarks DISABLE ROW LEVEL SECURITY;

-- Drop all RLS policies since we're not using them
DROP POLICY IF EXISTS "Anyone can read published articles" ON public.news_articles;
DROP POLICY IF EXISTS "Authors can manage their own articles" ON public.news_articles;
DROP POLICY IF EXISTS "Admins can manage all articles" ON public.news_articles;
DROP POLICY IF EXISTS "Users can manage their own reactions" ON public.news_article_reactions;
DROP POLICY IF EXISTS "Anyone can read reactions on published articles" ON public.news_article_reactions;
DROP POLICY IF EXISTS "Users can manage their own comments" ON public.news_article_comments;
DROP POLICY IF EXISTS "Anyone can read comments on published articles" ON public.news_article_comments;
DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON public.news_article_bookmarks;
DROP POLICY IF EXISTS "Users can read their own bookmarks" ON public.news_article_bookmarks;
DROP POLICY IF EXISTS "Allow article management" ON public.news_articles;
DROP POLICY IF EXISTS "Allow reaction management" ON public.news_article_reactions;
DROP POLICY IF EXISTS "Allow comment management" ON public.news_article_comments;
DROP POLICY IF EXISTS "Allow bookmark management" ON public.news_article_bookmarks;

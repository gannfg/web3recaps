import { Suspense } from 'react';
import { NewsArticlePage } from '@/components/news/news-article-page';
import { NewsArticlePageSkeleton } from '@/components/news/news-article-page-skeleton';
import { Metadata } from 'next';
import { createSupabaseServer } from '@/lib/supabase/server';

interface NewsArticlePageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: NewsArticlePageProps): Promise<Metadata> {
  try {
    const supabase = createSupabaseServer();
    if (!supabase) {
      return {
        title: 'Article Not Found - Web3 Recap',
        description: 'The requested article could not be found.',
      };
    }

    const { data: article, error } = await supabase
      .from('news_articles')
      .select(`
        *,
        author:users(id, display_name, avatar_url, role),
        category:news_categories(*)
      `)
      .eq('slug', params.slug)
      .eq('status', 'published')
      .single();

    if (error || !article) {
      return {
        title: 'Article Not Found - Web3 Recap',
        description: 'The requested article could not be found.',
      };
    }

    return {
      title: article.meta_title || article.title,
      description: article.meta_description || article.excerpt,
      keywords: article.tags,
      openGraph: {
        title: article.meta_title || article.title,
        description: article.meta_description || article.excerpt,
        type: 'article',
        publishedTime: article.published_at,
        modifiedTime: article.updated_at,
        authors: [article.author?.name || 'Web3 Recap'],
        section: article.category?.name,
        tags: article.tags,
        images: article.featured_image_url ? [
          {
            url: article.featured_image_url,
            width: 1200,
            height: 630,
            alt: article.title,
          }
        ] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: article.meta_title || article.title,
        description: article.meta_description || article.excerpt,
        images: article.featured_image_url ? [article.featured_image_url] : [],
      },
      alternates: {
        canonical: article.canonical_url || `${process.env.NEXT_PUBLIC_APP_URL}/news/${article.slug}`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Article - Web3 Recap',
      description: 'Read the latest Web3 and blockchain news and insights.',
    };
  }
}

export default function NewsArticlePageRoute({ params }: NewsArticlePageProps) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="h-10 w-10 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
          </div>
        }
      >
        <NewsArticlePage slug={params.slug} />
      </Suspense>
    </div>
  );
}

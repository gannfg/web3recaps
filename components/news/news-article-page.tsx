'use client';

import { useState, useEffect } from 'react';
import { NewsArticle, NewsArticleResponse } from '@/lib/news-types';
import { NewsArticleHeader } from './news-article-header';
import { NewsArticleContent } from './news-article-content';
import { NewsArticleComments } from './news-article-comments';
import { NewsRelatedArticles } from './news-related-articles';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share2, Bookmark, Heart, MessageCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { useSession } from '@/store/useSession';
import { useNewsCache } from '@/hooks/use-news-cache';

interface NewsArticlePageProps {
  slug: string;
}

export function NewsArticlePage({ slug }: NewsArticlePageProps) {
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  const router = useRouter();
  const { execute } = useApi();
  const { user } = useSession();
  const {
    getCachedArticleBySlug,
    cacheSingleArticle,
    needsSingleArticleRefresh,
    onSingleArticleRefresh,
    triggerRefresh
  } = useNewsCache();

  useEffect(() => {
    const loadArticle = async () => {
      try {
        setLoading(true);
        
        // Check cache first
        const cached = getCachedArticleBySlug(slug);
        if (cached) {
          setArticle(cached.article);
          setRelatedArticles(cached.relatedArticles);
          setLikeCount(cached.article.like_count || 0);
          setCommentCount(cached.article.comment_count || 0);
          setLoading(false);
          
          // Only refresh if data is stale and we haven't refreshed recently
          if (needsSingleArticleRefresh(slug)) {
            setRefreshing(true);
            onSingleArticleRefresh(slug);
          } else {
            // Data is fresh, no need to fetch
            return;
          }
        }

        // Fetch fresh data
        const result = await execute(`/api/news/${slug}`);
        
        if (!result.success) {
          if (result.error?.includes('404') || result.error?.includes('not found')) {
            setError('Article not found');
          } else {
            setError('Failed to load article');
          }
          return;
        }

        const data = result.data as NewsArticleResponse['data'];
        if (!data || !data.article) {
          console.error('No article in response:', data);
          setError('Article not found');
          return;
        }
        
        setArticle(data.article);
        setRelatedArticles(data.related_articles || []);
        setLikeCount(data.article.like_count || 0);
        setCommentCount(data.article.comment_count || 0);
        
        // Cache the article and related articles
        cacheSingleArticle(slug, data.article, data.related_articles || []);
        onSingleArticleRefresh(slug);
        
        // Check if user has bookmarked/liked this article
        await Promise.all([
          checkBookmarkStatus(data.article.id),
          checkLikeStatus(data.article.id),
        ]);
      } catch (error) {
        console.error('Error loading article:', error);
        setError('Failed to load article');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    loadArticle();
  }, [slug, user?.id]);

  const checkBookmarkStatus = async (articleId: string) => {
    if (!user?.id) {
      console.log('No user ID, skipping bookmark status check');
      return; // Don't check if user is not logged in
    }
    
    try {
      console.log('Checking bookmark status for user:', user.id);
      const result = await execute(`/api/news/${slug}/bookmarks`);
      if (result.success) {
        console.log('Bookmark status result:', result);
        setIsBookmarked(result.data.bookmarked);
      } else {
        console.log('Failed to check bookmark status:', result.error);
      }
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    }
  };

  const checkLikeStatus = async (articleId: string) => {
    if (!user?.id) {
      console.log('No user ID, skipping like status check');
      return; // Don't check if user is not logged in
    }
    
    try {
      console.log('Checking like status for user:', user.id);
      const result = await execute(`/api/news/${slug}/reactions`);
      if (result.success && result.data) {
        console.log('Reactions data:', result.data);
        // Check if current user has liked this article
        const userReaction = result.data.reactions?.find((r: any) => r.user_id === user.id);
        console.log('User reaction found:', userReaction);
        setIsLiked(!!userReaction);
      }
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const handleBookmark = async () => {
    try {
      console.log('Bookmark button clicked');
      const result = await execute(`/api/news/${slug}/bookmarks`, {
        method: 'POST',
      });
      
      console.log('Bookmark API result:', result);
      if (result.success) {
        setIsBookmarked(result.data.bookmarked);
        console.log('Bookmark state updated to:', result.data.bookmarked);
      } else {
        console.log('Bookmark API failed:', result.error);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleLike = async () => {
    try {
      const result = await execute(`/api/news/${slug}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ reaction_type: 'like' }),
      });
      
      if (result.success) {
        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share && article) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          {error || 'Article not found'}
        </h1>
        <p className="text-muted-foreground mb-6">
          The article you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Article Header */}
      <NewsArticleHeader 
        article={article}
        onBookmark={handleBookmark}
        onLike={handleLike}
        onShare={handleShare}
        isBookmarked={isBookmarked}
        isLiked={isLiked}
        likeCount={likeCount}
      />

      <div className="max-w-4xl mx-auto w-full">
            {/* Article Content */}
            <NewsArticleContent article={article} />


            {/* Comments Section */}
            <NewsArticleComments 
              articleId={article.id}
              slug={slug}
              commentCount={commentCount}
              onCommentCountChange={setCommentCount}
            />

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <NewsRelatedArticles articles={relatedArticles} />
            )}
      </div>
    </>
  );
}

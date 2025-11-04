'use client';

import { NewsArticle } from '@/lib/news-types';
import { OptimizedEngagement } from '@/components/engagement/optimized-engagement';

interface NewsArticleEngagementProps {
  article: NewsArticle;
  likeCount: number;
  commentCount: number;
  onLike: () => void;
  onShare: () => void;
  onBookmark: () => void;
  isLiked: boolean;
  isBookmarked: boolean;
}

export function NewsArticleEngagement({
  article,
  likeCount,
  commentCount,
  onLike,
  onShare,
  onBookmark,
  isLiked,
  isBookmarked,
}: NewsArticleEngagementProps) {
  return (
    <OptimizedEngagement
      entityId={article.id}
      entityType="article"
      initialData={{
        isLiked,
        isBookmarked,
        likeCount,
        commentCount,
      }}
      onUpdate={(data) => {
        // Update parent component state if needed
        if (data.isLiked !== isLiked) onLike();
        if (data.isBookmarked !== isBookmarked) onBookmark();
      }}
      showComments={true}
      showShare={true}
      showBookmark={true}
    />
  );
}

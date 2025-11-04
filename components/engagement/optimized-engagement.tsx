/**
 * Optimized engagement component with optimistic updates and debouncing
 */

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEngagement } from '@/hooks/use-engagement';
import { 
  ThumbsUp, 
  Bookmark, 
  Share2, 
  MessageCircle, 
  Heart,
  Loader2 
} from 'lucide-react';

interface OptimizedEngagementProps {
  entityId: string;
  entityType: 'article' | 'post' | 'project' | 'event';
  initialData: {
    isLiked: boolean;
    isBookmarked: boolean;
    likeCount: number;
    commentCount: number;
    shareCount?: number;
  };
  onUpdate?: (data: any) => void;
  showComments?: boolean;
  showShare?: boolean;
  showBookmark?: boolean;
  className?: string;
}

export const OptimizedEngagement = memo(function OptimizedEngagement({
  entityId,
  entityType,
  initialData,
  onUpdate,
  showComments = true,
  showShare = true,
  showBookmark = true,
  className = '',
}: OptimizedEngagementProps) {
  const { data, isLoading, error, actions } = useEngagement({
    entityId,
    entityType,
    initialData,
    onUpdate,
  });

  return (
    <Card className={`mb-8 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Like Button */}
          <div className="flex items-center gap-2">
            <Button
              variant={data.isLiked ? 'default' : 'ghost'}
              size="sm"
              onClick={actions.toggleLike}
              disabled={isLoading}
              className={`flex items-center gap-1 transition-all duration-200 ${
                data.isLiked 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : 'hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : data.isLiked ? (
                <Heart className="h-4 w-4 fill-current" />
              ) : (
                <ThumbsUp className="h-4 w-4" />
              )}
              {data.likeCount > 0 && (
                <span className="text-xs font-medium">
                  {data.likeCount.toLocaleString()}
                </span>
              )}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {showComments && (
              <Button 
                variant="outline" 
                size="sm"
                className="hover:bg-gray-50"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {data.commentCount.toLocaleString()} Comments
              </Button>
            )}
            
            {showShare && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={actions.share}
                className="hover:bg-gray-50"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}
            
            {showBookmark && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={actions.toggleBookmark}
                disabled={isLoading}
                className={`transition-all duration-200 ${
                  data.isBookmarked 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <Bookmark className={`h-4 w-4 mr-2 ${data.isBookmarked ? 'fill-current' : ''}`} />
                {data.isBookmarked ? 'Saved' : 'Save'}
              </Button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
            <Button 
              variant="link" 
              size="sm" 
              onClick={actions.refresh}
              className="ml-2 h-auto p-0 text-red-600"
            >
              Retry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Compact version for cards/lists
export const CompactEngagement = memo(function CompactEngagement({
  entityId,
  entityType,
  initialData,
  onUpdate,
  className = '',
}: Omit<OptimizedEngagementProps, 'showComments' | 'showShare' | 'showBookmark'>) {
  const { data, isLoading, actions } = useEngagement({
    entityId,
    entityType,
    initialData,
    onUpdate,
  });

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={actions.toggleLike}
        disabled={isLoading}
        className={`h-8 px-2 ${
          data.isLiked 
            ? 'text-blue-600 hover:text-blue-700' 
            : 'text-gray-500 hover:text-blue-600'
        }`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : data.isLiked ? (
          <Heart className="h-4 w-4 fill-current" />
        ) : (
          <ThumbsUp className="h-4 w-4" />
        )}
        {data.likeCount > 0 && (
          <span className="ml-1 text-xs">{data.likeCount}</span>
        )}
      </Button>

      {/* Only show bookmark for supported entity types */}
      {entityType !== 'post' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={actions.toggleBookmark}
          disabled={isLoading}
          className={`h-8 px-2 ${
            data.isBookmarked 
              ? 'text-blue-600 hover:text-blue-700' 
              : 'text-gray-500 hover:text-blue-600'
          }`}
        >
          <Bookmark className={`h-4 w-4 ${data.isBookmarked ? 'fill-current' : ''}`} />
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={actions.share}
        className="h-8 px-2 text-gray-500 hover:text-blue-600"
      >
        <Share2 className="h-4 w-4" />
      </Button>
    </div>
  );
});

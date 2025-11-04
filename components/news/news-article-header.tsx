'use client';

import { NewsArticle } from '@/lib/news-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Share2, 
  Bookmark, 
  Heart, 
  MessageCircle, 
  Eye, 
  Clock,
  Zap,
  Star,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface NewsArticleHeaderProps {
  article: NewsArticle;
  onBookmark: () => void;
  onLike: () => void;
  onShare: () => void;
  isBookmarked: boolean;
  isLiked: boolean;
  likeCount: number;
}

export function NewsArticleHeader({
  article,
  onBookmark,
  onLike,
  onShare,
  isBookmarked,
  isLiked,
  likeCount,
}: NewsArticleHeaderProps) {
  const router = useRouter();

  return (
    <div className="relative">
      {/* Back Button */}
      <div className="max-w-4xl mx-auto w-full pt-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to News
          </Button>
      </div>

      {/* Featured Image */}
      {article.featured_image_url && (
        <div className="max-w-4xl mx-auto w-full py-8">
            <div className="relative h-64 md:h-96 lg:h-[500px] rounded-lg overflow-hidden">
              <Image
                src={article.featured_image_url}
                alt={article.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-black/20" />
              
              {/* Overlay Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                <Badge 
                  variant="secondary" 
                  className="bg-white/90 text-black hover:bg-white/90"
                >
                  {article.category?.name}
                </Badge>
                {article.is_breaking && (
                  <Badge variant="destructive" className="bg-red-500">
                    <Zap className="h-3 w-3 mr-1" />
                    Breaking
                  </Badge>
                )}
                {article.is_featured && (
                  <Badge variant="default" className="bg-yellow-500 text-black">
                    <Star className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>

            </div>
        </div>
      )}

      {/* Article Info */}
      <div className="max-w-4xl mx-auto w-full py-8">
          <Card>
          <CardContent className="p-6">
            {/* Article Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              {article.title}
            </h1>

            {/* Article Excerpt */}
            {article.excerpt && (
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                {article.excerpt}
              </p>
            )}

            {/* Article Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {/* Author */}
                {article.author && (
                  <div className="flex items-center gap-2">
                    {article.author.avatar_url ? (
                      <Image
                        src={article.author.avatar_url}
                        alt={article.author.name}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {article.author.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-foreground">{article.author.name}</p>
                      <p className="text-xs">{article.author.role}</p>
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="w-px h-4 bg-border" />

                {/* Publish Date */}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(article.published_at || article.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>

                {/* Views */}
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {article.view_count || 0} views
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant={isLiked ? 'default' : 'outline'}
                  size="sm"
                  onClick={onLike}
                  className="flex items-center gap-2"
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  {likeCount}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBookmark}
                  className="flex items-center gap-2"
                >
                  <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                  {isBookmarked ? 'Saved' : 'Save'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShare}
                  className="flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

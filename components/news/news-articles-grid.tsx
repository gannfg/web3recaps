'use client';

import { memo } from 'react';
import { NewsArticle } from '@/lib/news-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Clock, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  Zap, 
  Star,
  ArrowUpDown
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface NewsArticlesGridProps {
  articles: NewsArticle[];
  loading: boolean;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export const NewsArticlesGrid = memo(function NewsArticlesGrid({ 
  articles, 
  loading, 
  onSortChange, 
  sortBy, 
  sortOrder 
}: NewsArticlesGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="h-48 bg-muted animate-pulse" />
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
          <Zap className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No articles found</h3>
        <p className="text-muted-foreground">
          Try adjusting your search or filter criteria
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(value) => {
              const [newSortBy, newSortOrder] = value.split('-');
              onSortChange(newSortBy, newSortOrder as 'asc' | 'desc');
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="published_at-desc">Latest</SelectItem>
              <SelectItem value="published_at-asc">Oldest</SelectItem>
              <SelectItem value="view_count-desc">Most Viewed</SelectItem>
              <SelectItem value="like_count-desc">Most Liked</SelectItem>
              <SelectItem value="engagement_score-desc">Most Engaged</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {articles.length} articles
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {articles.map((article) => (
          <Card key={article.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300">
            {/* Article Image */}
            <div className="relative h-48">
              {article.featured_image_url ? (
                <Image
                  src={article.featured_image_url}
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-4xl font-bold">
                    {article.title.charAt(0)}
                  </span>
                </div>
              )}
              
              {/* Overlay Badges */}
              <div className="absolute top-3 left-3 flex gap-2">
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

              {/* Video Indicator */}
              {article.external_url && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[12px] border-l-white border-y-[8px] border-y-transparent ml-1" />
                  </div>
                </div>
              )}
            </div>

            <CardContent className="p-4">
              {/* Article Title */}
              <Link href={`/news/${article.slug}`}>
                <h3 className="font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                  {article.title}
                </h3>
              </Link>

              {/* Article Excerpt */}
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {article.excerpt}
              </p>

              {/* Article Meta */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {article.reading_time || 5} min
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {article.view_count}
                  </div>
                </div>
                <div className="text-xs">
                  {new Date(article.published_at || article.created_at).toLocaleDateString()}
                </div>
              </div>

              {/* Engagement Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm">{article.like_count}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">{article.comment_count}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
})

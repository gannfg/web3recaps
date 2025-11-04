'use client';

import { NewsArticle } from '@/lib/news-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bookmark, 
  Share2, 
  Calendar, 
  Clock, 
  Eye, 
  Heart, 
  MessageCircle,
  User,
  Tag,
  ExternalLink
} from 'lucide-react';
import Image from 'next/image';

interface NewsArticleSidebarProps {
  article: NewsArticle;
  onBookmark: () => void;
  isBookmarked: boolean;
}

export function NewsArticleSidebar({ 
  article, 
  onBookmark, 
  isBookmarked 
}: NewsArticleSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Article Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant={isBookmarked ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={onBookmark}
          >
            <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
            {isBookmarked ? 'Saved' : 'Save Article'}
          </Button>
          
          <Button variant="outline" className="w-full justify-start">
            <Share2 className="h-4 w-4 mr-2" />
            Share Article
          </Button>
          
          {article.canonical_url && (
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href={article.canonical_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Original
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Article Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Article Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              Views
            </div>
            <span className="font-medium">{article.view_count}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              Likes
            </div>
            <span className="font-medium">{article.like_count}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              Comments
            </div>
            <span className="font-medium">{article.comment_count}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Reading Time
            </div>
            <span className="font-medium">{article.reading_time} min</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Published
            </div>
            <span className="font-medium">
              {new Date(article.published_at || article.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Author Info */}
      {article.author && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Author</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {article.author.avatar_url ? (
                <Image
                  src={article.author.avatar_url}
                  alt={article.author.name}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              ) : (
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <h4 className="font-medium text-foreground">{article.author.name}</h4>
                <p className="text-sm text-muted-foreground">{article.author.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category */}
      {article.category && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge 
              variant="outline" 
              className="text-sm"
              style={{ borderColor: article.category.color }}
            >
              <div 
                className="w-2 h-2 rounded-full mr-2" 
                style={{ backgroundColor: article.category.color }}
              />
              {article.category.name}
            </Badge>
            {article.category.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {article.category.description}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEO Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">SEO Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Meta Title:</span>
            <p className="text-foreground">{article.meta_title || article.title}</p>
          </div>
          
          <div>
            <span className="font-medium text-muted-foreground">Meta Description:</span>
            <p className="text-foreground">{article.meta_description || article.excerpt}</p>
          </div>
          
          <div>
            <span className="font-medium text-muted-foreground">Canonical URL:</span>
            <p className="text-foreground break-all">
              {article.canonical_url || `https://web3indonesia.com/news/${article.slug}`}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

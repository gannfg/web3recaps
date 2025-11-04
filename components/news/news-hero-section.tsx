'use client';

import { NewsArticle } from '@/lib/news-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  Zap, 
  Star,
  Play
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface NewsHeroSectionProps {
  featuredArticle: NewsArticle | null;
  breakingNews: NewsArticle[];
}

export function NewsHeroSection({ featuredArticle, breakingNews }: NewsHeroSectionProps) {
  return (
    <div className="w-full mb-8">
      {/* Hero Featured Article */}
      {featuredArticle && (
        <div className="relative bg-card rounded-xl overflow-hidden border shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Image Section */}
            <div className="relative h-64 lg:h-96">
              {featuredArticle.featured_image_url ? (
                <Image
                  src={featuredArticle.featured_image_url}
                  alt={featuredArticle.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-6xl font-bold">
                    {featuredArticle.title.charAt(0)}
                  </span>
                </div>
              )}
              
              {/* Video Indicator */}
              {featuredArticle.external_url && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-black/70 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                </div>
              )}

              {/* Overlay Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {featuredArticle.is_breaking && (
                  <Badge variant="destructive" className="bg-red-500">
                    <Zap className="h-3 w-3 mr-1" />
                    BREAKING
                  </Badge>
                )}
                {featuredArticle.is_featured && (
                  <Badge variant="default" className="bg-yellow-500 text-black">
                    <Star className="h-3 w-3 mr-1" />
                    FEATURED
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-white/90 text-black">
                  {featuredArticle.category?.name}
                </Badge>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 lg:p-8 flex flex-col justify-between">
              <div>
                <Link href={`/news/${featuredArticle.slug}`}>
                  <h1 className="text-2xl lg:text-4xl font-bold text-foreground mb-4 hover:text-blue-600 transition-colors line-clamp-3">
                    {featuredArticle.title}
                  </h1>
                </Link>
                
                <p className="text-muted-foreground text-lg mb-6 line-clamp-4">
                  {featuredArticle.excerpt}
                </p>

                {/* Author Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold">
                      {featuredArticle.author?.name?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {featuredArticle.author?.name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(featuredArticle.published_at || featuredArticle.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Engagement Stats */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">{featuredArticle.reading_time || 5} min read</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">{featuredArticle.view_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm">{featuredArticle.like_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">{featuredArticle.comment_count || 0}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
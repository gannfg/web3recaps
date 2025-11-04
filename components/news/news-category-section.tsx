'use client';

import { NewsArticle, NewsCategory } from '@/lib/news-types';
import { Badge } from '@/components/ui/badge';
import { Clock, Eye, Heart, MessageCircle, Share2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface NewsCategorySectionProps {
  category: NewsCategory;
  articles: NewsArticle[];
  showAll?: boolean;
}

export function NewsCategorySection({ category, articles, showAll = false }: NewsCategorySectionProps) {
  if (articles.length === 0) return null;

  const displayArticles = showAll ? articles : articles.slice(0, 4);

  return (
    <div className="mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: category.color }}
          />
          <h2 className="text-2xl font-bold text-foreground">{category.name}</h2>
          <Badge variant="secondary" className="text-sm">
            {articles.length} articles
          </Badge>
        </div>
        {!showAll && articles.length > 4 && (
          <Link 
            href={`/news?category=${category.id}`}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            View All →
          </Link>
        )}
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayArticles.map((article, index) => (
          <article 
            key={article.id} 
            className={`group hover:shadow-lg transition-all duration-300 ${
              index === 0 && !showAll ? 'md:col-span-2 lg:col-span-1' : ''
            }`}
          >
            <div className="bg-card rounded-lg border overflow-hidden h-full flex flex-col">
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
                  {article.is_breaking && (
                    <Badge variant="destructive" className="text-xs">
                      BREAKING
                    </Badge>
                  )}
                  {article.is_featured && (
                    <Badge variant="default" className="bg-yellow-500 text-black text-xs">
                      FEATURED
                    </Badge>
                  )}
                </div>
              </div>

              {/* Article Content */}
              <div className="p-4 flex-1 flex flex-col">
                <Link href={`/news/${article.slug}`}>
                  <h3 className="font-semibold text-foreground group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                    {article.title}
                  </h3>
                </Link>
                
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
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
                      {article.view_count || 0}
                    </div>
                  </div>
                  <div className="text-xs">
                    {new Date(article.published_at || article.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Engagement Stats */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Heart className="h-4 w-4" />
                      <span className="text-sm">{article.like_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-sm">{article.comment_count || 0}</span>
                    </div>
                  </div>
                  <button className="h-8 w-8 p-0 hover:bg-muted rounded-full flex items-center justify-center transition-colors">
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

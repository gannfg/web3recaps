'use client';

import { NewsArticle } from '@/lib/news-types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Eye, Heart, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface NewsRelatedArticlesProps {
  articles: NewsArticle[];
}

export function NewsRelatedArticles({ articles }: NewsRelatedArticlesProps) {
  if (articles.length === 0) return null;

  return (
    <Card className="mt-8">
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold text-foreground mb-4">
          Related Articles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/news/${article.slug}`}
              className="group block"
            >
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex gap-4 p-4">
                  {/* Article Image */}
                  <div className="relative w-24 h-24 flex-shrink-0">
                    {article.featured_image_url ? (
                      <Image
                        src={article.featured_image_url}
                        alt={article.title}
                        fill
                        className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 rounded-md flex items-center justify-center">
                        <span className="text-white text-lg font-bold">
                          {article.title.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Article Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {article.category?.name}
                      </Badge>
                      {article.is_breaking && (
                        <Badge variant="destructive" className="text-xs">
                          Breaking
                        </Badge>
                      )}
                    </div>
                    
                    <h4 className="font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                      {article.title}
                    </h4>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {article.excerpt}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {article.reading_time} min
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.view_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {article.like_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {article.comment_count}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

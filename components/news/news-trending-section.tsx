'use client';

import { NewsArticle } from '@/lib/news-types';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, Eye } from 'lucide-react';
import Link from 'next/link';

interface NewsTrendingSectionProps {
  trendingArticles: NewsArticle[];
}

export function NewsTrendingSection({ trendingArticles }: NewsTrendingSectionProps) {
  if (trendingArticles.length === 0) return null;

  return (
    <div className="bg-card rounded-lg border p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-orange-500" />
        <h2 className="text-xl font-bold text-foreground">Trending Now</h2>
      </div>
      
      <div className="space-y-4">
        {trendingArticles.slice(0, 5).map((article, index) => (
          <div key={article.id} className="flex items-start gap-4 group">
            <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
              <span className="text-orange-600 dark:text-orange-400 font-bold text-sm">
                {index + 1}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <Link 
                href={`/news/${article.slug}`}
                className="group-hover:text-blue-600 transition-colors"
              >
                <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
                  {article.title}
                </h3>
              </Link>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {article.reading_time || 5} min
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {article.view_count || 0} views
                </div>
                <span>
                  {new Date(article.published_at || article.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            {article.is_breaking && (
              <Badge variant="destructive" className="text-xs">
                BREAKING
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

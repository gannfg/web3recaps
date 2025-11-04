'use client';

import { NewsArticle } from '@/lib/news-types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Share2, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { parseArticleContent } from '@/lib/news-html-utils';

interface NewsArticleContentProps {
  article: NewsArticle;
}

export function NewsArticleContent({ article }: NewsArticleContentProps) {
  // HTML content renderer for rich text editor output
  const renderContent = (content: string) => {
    if (!content || content.trim() === '') {
      return <p className="text-muted-foreground italic">No content available.</p>;
    }
    
    // Parse and enhance the content using our utility
    const enhancedContent = parseArticleContent(content);
    
    // Always render as HTML since content is stored as HTML from the rich text editor
    return (
      <div 
        className="article-content prose prose-lg max-w-none break-words overflow-wrap-anywhere"
        style={{
          lineHeight: '1.7',
          fontSize: '1.125rem',
          color: 'hsl(var(--foreground))',
          wordWrap: 'break-word',
          overflowWrap: 'anywhere',
          whiteSpace: 'pre-wrap'
        }}
        dangerouslySetInnerHTML={{ __html: enhancedContent }}
      />
    );
  };

  return (
    <Card className="mb-8">
      <CardContent className="p-4 sm:p-6">
        {/* Article Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {article.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Article Content */}
        <div className="article-content-wrapper">
          {renderContent(article.content)}
        </div>

        {/* Article Footer */}
        <div className="mt-8 pt-6 border-t">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              <p>Published on {new Date(article.published_at || article.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}</p>
              {article.updated_at !== article.created_at && (
                <p>Last updated on {new Date(article.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}</p>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Share2 className="h-4 w-4 mr-2" />
                Share Article
              </Button>
              {article.canonical_url && (
                <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                  <a href={article.canonical_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Original Source
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

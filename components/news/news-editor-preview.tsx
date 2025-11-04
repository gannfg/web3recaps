'use client';

import { NewsArticle, NewsArticleFormData, NewsCategory } from '@/lib/news-types';
import { Card, CardContent } from '@/components/ui/card';
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
  Calendar,
  User
} from 'lucide-react';
import Image from 'next/image';
import { parseArticleContent } from '@/lib/news-html-utils';

interface NewsEditorPreviewProps {
  article: NewsArticle | null;
  formData: NewsArticleFormData;
  categories: NewsCategory[];
}

export function NewsEditorPreview({ 
  article, 
  formData, 
  categories 
}: NewsEditorPreviewProps) {
  const selectedCategory = categories.find(cat => cat.id === formData.category_id);
  
  // HTML content renderer for preview (same as article view)
  const renderContent = (content: string) => {
    if (!content || content.trim() === '') {
      return <p className="text-muted-foreground italic">Start writing your article content...</p>;
    }
    
    // Parse and enhance the content using our utility (same as article view)
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

  const wordCount = formData.content.split(/\s+/).filter(word => word.length > 0).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="space-y-6">
      {/* Article Header Preview */}
      <Card>
        <CardContent className="p-0">
          {/* Featured Image */}
          {formData.featured_image_url && (
            <div className="relative h-64 md:h-96">
              <Image
                src={formData.featured_image_url}
                alt={formData.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/20" />
              
              {/* Overlay Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {selectedCategory && (
                  <Badge 
                    variant="secondary" 
                    className="bg-white/90 text-black hover:bg-white/90"
                  >
                    {selectedCategory.name}
                  </Badge>
                )}
                {formData.is_breaking && (
                  <Badge variant="destructive" className="bg-red-500">
                    <Zap className="h-3 w-3 mr-1" />
                    Breaking
                  </Badge>
                )}
                {formData.is_featured && (
                  <Badge variant="default" className="bg-yellow-500 text-black">
                    <Star className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>

            </div>
          )}

          {/* Article Info */}
          <div className="p-6">
            {/* Article Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
              {formData.title || 'Article Title'}
            </h1>

            {/* Article Excerpt */}
            {formData.excerpt && (
              <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                {formData.excerpt}
              </p>
            )}

            {/* Article Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {/* Author */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Chief Editor</p>
                    <p className="text-xs">Web3 Recap</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px h-4 bg-border" />

                {/* Publish Date */}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>

                {/* Reading Time */}
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {readingTime} min read
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  0
                </Button>
                
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  0
                </Button>
                
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Article Stats */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground pt-4 border-t">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                0 views
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                0 likes
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                0 comments
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Article Content Preview */}
      <Card>
        <CardContent className="p-6">
          {/* Article Tags */}
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Article Content */}
          <div className="article-content-wrapper">
            {renderContent(formData.content)}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}


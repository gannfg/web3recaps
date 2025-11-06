'use client';

import { NewsArticle, NewsCategory } from '@/lib/news-types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Star,
  Loader2,
  Eye,
  Calendar,
  Filter
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface NewsLayoutBuilderProps {
  articles: NewsArticle[];
  categories?: NewsCategory[];
  events?: any[];
  onUpdateArticleLayout?: (articleIdOrSlug: string, layoutPosition: string) => void;
  onUpdateEventLayout?: (eventId: string, layoutPosition: string) => void;
  onUpdateArticleFeatured?: (articleId: string, isFeatured: boolean) => void;
  loading?: boolean;
}

export function NewsLayoutBuilder({
  articles,
  categories = [],
  events = [],
  onUpdateArticleLayout,
  onUpdateEventLayout,
  onUpdateArticleFeatured,
  loading = false,
}: NewsLayoutBuilderProps) {
  const [updatingArticles, setUpdatingArticles] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Get featured and non-featured articles
  const featuredArticles = articles
    .filter(article => article.is_featured)
    .filter(article => !selectedCategory || article.category_id === selectedCategory)
    .sort((a, b) => {
      // Sort by published_at or created_at, most recent first
      const dateA = new Date(a.published_at || a.created_at).getTime();
      const dateB = new Date(b.published_at || b.created_at).getTime();
      return dateB - dateA;
    });

  const nonFeaturedArticles = articles
    .filter(article => !article.is_featured)
    .filter(article => !selectedCategory || article.category_id === selectedCategory);

  // Helper to get category name
  const getCategoryName = (article: NewsArticle): string | undefined => {
    if (article.category) {
      return article.category.name;
    }
    const category = categories.find(cat => cat.id === article.category_id);
    return category?.name;
  };

  const handleToggleFeatured = async (article: NewsArticle, isFeatured: boolean) => {
    if (!onUpdateArticleFeatured) return;
    
    const identifier = article.slug || article.id;
    setUpdatingArticles(prev => new Set(prev).add(identifier));
    
    try {
      await onUpdateArticleFeatured(identifier, isFeatured);
    } catch (error) {
      console.error('Error updating featured status:', error);
    } finally {
      setUpdatingArticles(prev => {
        const next = new Set(prev);
        next.delete(identifier);
        return next;
      });
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Featured Articles Manager
          </CardTitle>
          <CardDescription>
            Manage which articles appear as featured on the news page. Featured articles are displayed prominently at the top.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category Filter */}
          {categories.length > 0 && (
            <Card className="bg-card border">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">Categories</h3>
                  </div>
                  <Select 
                    value={selectedCategory || "all"} 
                    onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span>All Categories</span>
                        </div>
                      </SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: category.color || 'var(--primary)' }}
                            ></div>
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Featured Articles Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Featured Articles ({featuredArticles.length})
              </h3>
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                These appear on the news page
              </Badge>
            </div>

            {featuredArticles.length > 0 ? (
              <div className="space-y-3">
                {featuredArticles.map((article, index) => {
                  const identifier = article.slug || article.id;
                  const isUpdating = updatingArticles.has(identifier);
                  
                  return (
                    <Card key={article.id} className="border-2 border-yellow-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Article Image */}
                          {article.featured_image_url ? (
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                              <Image
                                src={article.featured_image_url}
                                alt={article.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-2xl font-bold">
                                {article.title.charAt(0)}
                              </span>
                            </div>
                          )}

                          {/* Article Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-1">
                              <h4 className="font-semibold text-base truncate">{article.title}</h4>
                              <Badge variant="default" className="bg-yellow-500 text-black flex-shrink-0">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {article.view_count || 0} views
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(article.published_at || article.created_at).toLocaleDateString()}
                              </span>
                              {getCategoryName(article) && (
                                <Badge variant="outline" className="text-xs">
                                  {getCategoryName(article)}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Featured Toggle */}
                            {onUpdateArticleFeatured && (
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={article.is_featured}
                                  onCheckedChange={(checked) => handleToggleFeatured(article, checked)}
                                  disabled={isUpdating}
                                />
                                {isUpdating && (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No featured articles yet. Toggle articles below to feature them.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Non-Featured Articles Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                All Published Articles ({nonFeaturedArticles.length})
              </h3>
            </div>

            {nonFeaturedArticles.length > 0 ? (
              <div className="space-y-2">
                {nonFeaturedArticles.map((article) => {
                  const identifier = article.slug || article.id;
                  const isUpdating = updatingArticles.has(identifier);
                  
                  return (
                    <Card key={article.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Article Image */}
                          {article.featured_image_url ? (
                            <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
                              <Image
                                src={article.featured_image_url}
                                alt={article.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-lg font-bold">
                                {article.title.charAt(0)}
                              </span>
                            </div>
                          )}

                          {/* Article Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{article.title}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>{article.view_count || 0} views</span>
                              <span>•</span>
                              <span>{new Date(article.published_at || article.created_at).toLocaleDateString()}</span>
                              {getCategoryName(article) && (
                                <>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-xs">
                                    {getCategoryName(article)}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Featured Toggle */}
                          {onUpdateArticleFeatured && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-sm text-muted-foreground">Feature</span>
                              <Switch
                                checked={false}
                                onCheckedChange={(checked) => handleToggleFeatured(article, checked)}
                                disabled={isUpdating}
                              />
                              {isUpdating && (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No published articles available.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { NewsArticle, NewsCategory } from '@/lib/news-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Play,
  Filter,
  Tag
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface NewsCNNLayoutProps {
  articles: NewsArticle[];
  categories: NewsCategory[];
  loading: boolean;
  onCategoryChange: (categoryId: string | null) => void;
  activeCategory: string | null;
}

export function NewsCNNLayout({ 
  articles, 
  categories, 
  loading, 
  onCategoryChange, 
  activeCategory 
}: NewsCNNLayoutProps) {
  // Get featured article (first featured or first regular)
  const featuredArticle = articles.find(article => article.is_featured) || articles[0] || null;
  
  // Get other articles (excluding the featured one)
  const otherArticles = articles.filter(article => article.id !== featuredArticle?.id);
  
  // Group articles by category for sidebar
  const articlesByCategory = categories.reduce((acc, category) => {
    const categoryArticles = articles.filter(article => article.category_id === category.id);
    if (categoryArticles.length > 0) {
      acc[category.id] = categoryArticles;
    }
    return acc;
  }, {} as Record<string, NewsArticle[]>);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-96 bg-muted animate-pulse rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      {/* Top Bar */}
      <div className="w-full bg-card border-b mb-6">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Categories Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={activeCategory || 'all'}
                onValueChange={(value) => onCategoryChange(value === 'all' ? null : value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue>
                    {activeCategory ? (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: categories.find(c => c.id === activeCategory)?.color }}
                        />
                        {categories.find(c => c.id === activeCategory)?.name}
                      </div>
                    ) : (
                      'All News'
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      All News
                      <Badge variant="secondary" className="ml-auto">
                        {articles.length}
                      </Badge>
                    </div>
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                        <Badge variant="secondary" className="ml-auto">
                          {articlesByCategory[category.id]?.length || 0}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Filters Dropdown */}
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <Select defaultValue="all">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Articles</SelectItem>
                  <SelectItem value="breaking">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-red-500" />
                      Breaking News
                      <Badge variant="destructive" className="ml-auto">
                        {articles.filter(a => a.is_breaking).length}
                      </Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="featured">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      Featured
                      <Badge variant="secondary" className="ml-auto">
                        {articles.filter(a => a.is_featured).length}
                      </Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags Dropdown */}
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <Select defaultValue="all">
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {['Web3', 'Blockchain', 'DeFi', 'NFT', 'Crypto', 'Recap', 'Bitcoin', 'Ethereum'].map((tag) => (
                    <SelectItem key={tag} value={tag.toLowerCase()}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="py-4 sm:py-6 lg:py-8">
        {/* Main Featured Article */}
        {featuredArticle && (
          <div className="mb-12">
            <div className="bg-card rounded-xl overflow-hidden border shadow-lg">
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
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-8">
            {/* Latest News Section */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Latest News</h2>
              <div className="space-y-6">
                {otherArticles.slice(0, 6).map((article, index) => (
                  <article key={article.id} className="group hover:shadow-lg transition-all duration-300">
                    <div className="flex gap-4">
                      {/* Article Image */}
                      <div className="relative w-32 h-24 flex-shrink-0">
                        {article.featured_image_url ? (
                          <Image
                            src={article.featured_image_url}
                            alt={article.title}
                            fill
                            className="object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-2xl font-bold">
                              {article.title.charAt(0)}
                            </span>
                          </div>
                        )}
                        
                        {/* Breaking Badge */}
                        {article.is_breaking && (
                          <Badge variant="destructive" className="absolute top-2 left-2 text-xs">
                            BREAKING
                          </Badge>
                        )}
                      </div>

                      {/* Article Content */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/news/${article.slug}`}>
                          <h3 className="font-semibold text-foreground group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                            {article.title}
                          </h3>
                        </Link>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {article.excerpt}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {article.reading_time || 5} min
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {article.view_count || 0}
                          </div>
                          <span>
                            {new Date(article.published_at || article.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

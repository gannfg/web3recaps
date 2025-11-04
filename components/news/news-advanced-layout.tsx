'use client';

import { NewsArticle, NewsCategory } from '@/lib/news-types';
import { NewsHeroSection } from './news-hero-section';
import { NewsTrendingSection } from './news-trending-section';
import { NewsCategorySection } from './news-category-section';
import { NewsTopBar } from './news-top-bar';

interface NewsAdvancedLayoutProps {
  articles: NewsArticle[];
  categories: NewsCategory[];
  loading: boolean;
  onCategoryChange: (categoryId: string | null) => void;
  activeCategory: string | null;
}

export function NewsAdvancedLayout({ 
  articles, 
  categories, 
  loading, 
  onCategoryChange, 
  activeCategory 
}: NewsAdvancedLayoutProps) {
  // Categorize articles
  const breakingNews = articles.filter(article => article.is_breaking);
  const featuredArticles = articles.filter(article => article.is_featured);
  const trendingArticles = articles.filter(article => article.is_trending);
  const regularArticles = articles.filter(article => !article.is_breaking && !article.is_featured);

  // Get the main featured article (first featured or first regular)
  const mainFeaturedArticle = featuredArticles[0] || regularArticles[0] || null;

  // Group articles by category
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
      <NewsTopBar
        categories={categories}
        onCategoryChange={onCategoryChange}
        activeCategory={activeCategory}
      />

      <div className="py-4 sm:py-6 lg:py-8">
        {/* Hero Section */}
        <NewsHeroSection 
          featuredArticle={mainFeaturedArticle}
          breakingNews={breakingNews}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Trending Section */}
            {trendingArticles.length > 0 && (
              <NewsTrendingSection trendingArticles={trendingArticles} />
            )}

            {/* Category Sections */}
            {Object.entries(articlesByCategory).map(([categoryId, categoryArticles]) => {
              const category = categories.find(c => c.id === categoryId);
              if (!category) return null;
              
              return (
                <NewsCategorySection
                  key={categoryId}
                  category={category}
                  articles={categoryArticles}
                  showAll={activeCategory === categoryId}
                />
              );
            })}

            {/* General Articles Section */}
            {regularArticles.length > 0 && !activeCategory && (
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Latest News</h2>
                  <span className="text-sm text-muted-foreground">
                    {regularArticles.length} articles
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularArticles.slice(0, 6).map((article) => (
                    <article key={article.id} className="group hover:shadow-lg transition-all duration-300">
                      <div className="bg-card rounded-lg border overflow-hidden h-full flex flex-col">
                        <div className="relative h-48">
                          {article.featured_image_url ? (
                            <img
                              src={article.featured_image_url}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <span className="text-white text-4xl font-bold">
                                {article.title.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4 flex-1 flex flex-col">
                          <h3 className="font-semibold text-foreground group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                            {article.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{new Date(article.published_at || article.created_at).toLocaleDateString()}</span>
                            <span>{article.view_count || 0} views</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Quick Stats */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">News Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Articles</span>
                    <span className="font-semibold">{articles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Breaking News</span>
                    <span className="font-semibold text-red-500">{breakingNews.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Featured</span>
                    <span className="font-semibold text-yellow-500">{featuredArticles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trending</span>
                    <span className="font-semibold text-orange-500">{trendingArticles.length}</span>
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Categories</h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => onCategoryChange(category.id)}
                      className={`w-full text-left p-2 rounded-lg transition-colors ${
                        activeCategory === category.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm">{category.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

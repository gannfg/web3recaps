import { useState, useCallback, useRef, useEffect } from 'react';
import type { NewsArticle, NewsCategory, NewsFilters } from '@/lib/news-types';

interface CachedArticle extends NewsArticle {
  cachedAt: number;
}

interface CachedCategory extends NewsCategory {
  cachedAt: number;
}

interface CachedPage {
  articles: string[]; // Store article IDs
  cachedAt: number;
  filters: NewsFilters;
}

interface CachedSingleArticle {
  article: NewsArticle;
  relatedArticles: NewsArticle[];
  cachedAt: number;
}

const CACHE_CONFIG = {
  FRESH_DURATION: 5 * 60 * 1000,    // 5 minutes fresh
  MAX_AGE: 30 * 60 * 1000,          // 30 minutes max
  STALE_WHILE_REVALIDATE: 2 * 60 * 1000, // 2 minutes stale
  MAX_ARTICLES: 200,                 // Memory limits
  MAX_CATEGORIES: 50,
  MAX_PAGES: 30,
  MAX_SINGLE_ARTICLES: 100
};

// Cache stores
const articlesCache = new Map<string, CachedArticle>(); // articleId -> article
const categoriesCache = new Map<string, CachedCategory>(); // categoryId -> category
const pagesCache = new Map<string, CachedPage>(); // pageKey -> { articles: articleId[], cachedAt, filters }
const singleArticleCache = new Map<string, CachedSingleArticle>(); // slug -> { article, relatedArticles, cachedAt }

// LRU eviction for maps
function evictOldest<K, V extends { cachedAt: number }>(cache: Map<K, V>, maxSize: number) {
  if (cache.size > maxSize) {
    const oldestKey = Array.from(cache.keys()).reduce((a, b) =>
      (cache.get(a)!.cachedAt < cache.get(b)!.cachedAt ? a : b)
    );
    cache.delete(oldestKey);
  }
}

// Generate cache key for pages
function generatePageKey(filters: NewsFilters): string {
  const keyParts = [
    `page:${filters.page || 1}`,
    `limit:${filters.limit || 12}`,
    `status:${filters.status || 'all'}`,
    `category:${filters.category_id || 'all'}`,
    `breaking:${filters.is_breaking || false}`,
    `featured:${filters.is_featured || false}`,
    `search:${filters.search || 'none'}`,
    `sort:${filters.sort_by || 'published_at'}`,
    `order:${filters.sort_order || 'desc'}`,
    `author:${filters.author_id || 'all'}`,
    `tags:${filters.tags?.join(',') || 'none'}`,
    `dateFrom:${filters.date_from || 'none'}`,
    `dateTo:${filters.date_to || 'none'}`
  ];
  return keyParts.join('|');
}

export function useNewsCache() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimestamps = useRef(new Map<string, number>()); // pageKey -> lastRefreshTime

  // Article cache methods
  const getCachedArticle = useCallback((articleId: string): NewsArticle | undefined => {
    const cached = articlesCache.get(articleId);
    if (cached && Date.now() - cached.cachedAt < CACHE_CONFIG.MAX_AGE) {
      return cached;
    }
    return undefined;
  }, []);

  const getCachedArticleBySlug = useCallback((slug: string): CachedSingleArticle | undefined => {
    const cached = singleArticleCache.get(slug);
    if (cached && Date.now() - cached.cachedAt < CACHE_CONFIG.MAX_AGE) {
      return cached;
    }
    return undefined;
  }, []);

  const getCachedArticles = useCallback((filters: NewsFilters): NewsArticle[] | undefined => {
    const pageKey = generatePageKey(filters);
    const pageData = pagesCache.get(pageKey);
    
    if (!pageData || Date.now() - pageData.cachedAt > CACHE_CONFIG.MAX_AGE) {
      return undefined;
    }

    const articles = pageData.articles
      .map(id => getCachedArticle(id))
      .filter(Boolean) as NewsArticle[];

    return articles.length === pageData.articles.length ? articles : undefined;
  }, [getCachedArticle]);

  const getCachedCategories = useCallback((): NewsCategory[] => {
    const categories: NewsCategory[] = [];
    categoriesCache.forEach((category) => {
      if (Date.now() - category.cachedAt < CACHE_CONFIG.MAX_AGE) {
        categories.push(category);
      }
    });
    return categories;
  }, []);

  // Cache storage methods
  const cacheArticle = useCallback((article: NewsArticle) => {
    articlesCache.set(article.id, { ...article, cachedAt: Date.now() });
    evictOldest(articlesCache, CACHE_CONFIG.MAX_ARTICLES);
  }, []);

  const cacheCategory = useCallback((category: NewsCategory) => {
    categoriesCache.set(category.id, { ...category, cachedAt: Date.now() });
    evictOldest(categoriesCache, CACHE_CONFIG.MAX_CATEGORIES);
  }, []);

  const cacheArticles = useCallback((filters: NewsFilters, articles: NewsArticle[]) => {
    articles.forEach(article => cacheArticle(article));
    
    const pageKey = generatePageKey(filters);
    pagesCache.set(pageKey, {
      articles: articles.map(a => a.id),
      cachedAt: Date.now(),
      filters: { ...filters }
    });
    evictOldest(pagesCache, CACHE_CONFIG.MAX_PAGES);
  }, [cacheArticle]);

  const cacheSingleArticle = useCallback((slug: string, article: NewsArticle, relatedArticles: NewsArticle[]) => {
    // Cache the main article
    cacheArticle(article);
    
    // Cache related articles
    relatedArticles.forEach(relArticle => cacheArticle(relArticle));
    
    // Cache the single article response
    singleArticleCache.set(slug, {
      article,
      relatedArticles,
      cachedAt: Date.now()
    });
    evictOldest(singleArticleCache, CACHE_CONFIG.MAX_SINGLE_ARTICLES);
  }, [cacheArticle]);

  const cacheCategories = useCallback((categories: NewsCategory[]) => {
    categories.forEach(category => cacheCategory(category));
  }, [cacheCategory]);

  // Cache update methods
  const updateCachedArticle = useCallback((articleId: string, updates: Partial<NewsArticle>) => {
    const existing = articlesCache.get(articleId);
    if (existing) {
      articlesCache.set(articleId, { ...existing, ...updates, cachedAt: Date.now() });
    }
  }, []);

  const addCachedArticle = useCallback((newArticle: NewsArticle) => {
    cacheArticle(newArticle);
    // Invalidate all pages to ensure new article appears
    pagesCache.clear();
    refreshTimestamps.current.clear();
  }, [cacheArticle]);

  const removeCachedArticle = useCallback((articleId: string) => {
    articlesCache.delete(articleId);
    singleArticleCache.delete(articleId);
    
    // Invalidate all pages that might contain this article
    pagesCache.forEach((pageData, pageKey) => {
      if (pageData.articles.includes(articleId)) {
        pagesCache.delete(pageKey);
        refreshTimestamps.current.delete(pageKey);
      }
    });
  }, []);

  // Cache validation methods
  const needsRefresh = useCallback((filters: NewsFilters): boolean => {
    const pageKey = generatePageKey(filters);
    const pageData = pagesCache.get(pageKey);
    
    if (!pageData) return true; // No cache, needs refresh

    const lastRefresh = refreshTimestamps.current.get(pageKey) || 0;
    const isStale = Date.now() - pageData.cachedAt > CACHE_CONFIG.STALE_WHILE_REVALIDATE;
    const hasBeenRefreshedRecently = Date.now() - lastRefresh < CACHE_CONFIG.STALE_WHILE_REVALIDATE;

    return isStale && !hasBeenRefreshedRecently;
  }, []);

  const needsSingleArticleRefresh = useCallback((slug: string): boolean => {
    const cached = singleArticleCache.get(slug);
    if (!cached) return true;

    const lastRefresh = refreshTimestamps.current.get(`single:${slug}`) || 0;
    const isStale = Date.now() - cached.cachedAt > CACHE_CONFIG.STALE_WHILE_REVALIDATE;
    const hasBeenRefreshedRecently = Date.now() - lastRefresh < CACHE_CONFIG.STALE_WHILE_REVALIDATE;

    return isStale && !hasBeenRefreshedRecently;
  }, []);

  const onRefresh = useCallback((filters: NewsFilters) => {
    const pageKey = generatePageKey(filters);
    refreshTimestamps.current.set(pageKey, Date.now());
  }, []);

  const onSingleArticleRefresh = useCallback((slug: string) => {
    refreshTimestamps.current.set(`single:${slug}`, Date.now());
  }, []);

  const triggerRefresh = useCallback(() => {
    // Invalidate all caches to force a full refresh
    pagesCache.clear();
    singleArticleCache.clear();
    refreshTimestamps.current.clear();
  }, []);

  // DISABLED: Background refresh causing infinite loops
  // useEffect(() => {
  //   const refreshStaleData = () => {
  //     const now = Date.now();
  //     
  //     // Check pages cache
  //     pagesCache.forEach((pageData, pageKey) => {
  //       const isStale = now - pageData.cachedAt > CACHE_CONFIG.STALE_WHILE_REVALIDATE;
  //       const lastRefresh = refreshTimestamps.current.get(pageKey) || 0;
  //       const hasBeenRefreshedRecently = now - lastRefresh < CACHE_CONFIG.STALE_WHILE_REVALIDATE;
  //       
  //       if (isStale && !hasBeenRefreshedRecently) {
  //         // Mark for refresh on next access
  //         refreshTimestamps.current.set(pageKey, now);
  //       }
  //     });

  //     // Check single articles cache
  //     singleArticleCache.forEach((cached, slug) => {
  //       const isStale = now - cached.cachedAt > CACHE_CONFIG.STALE_WHILE_REVALIDATE;
  //       const lastRefresh = refreshTimestamps.current.get(`single:${slug}`) || 0;
  //       const hasBeenRefreshedRecently = now - lastRefresh < CACHE_CONFIG.STALE_WHILE_REVALIDATE;
  //       
  //       if (isStale && !hasBeenRefreshedRecently) {
  //         refreshTimestamps.current.set(`single:${slug}`, now);
  //       }
  //     });
  //   };

  //   // Refresh every 2 minutes (less frequent to prevent issues)
  //   const interval = setInterval(refreshStaleData, 2 * 60 * 1000);
  //   
  //   // Also refresh when tab becomes visible
  //   const handleVisibilityChange = () => {
  //     if (!document.hidden) {
  //       refreshStaleData();
  //     }
  //   };
  //   
  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   
  //   return () => {
  //     clearInterval(interval);
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   };
  // }, []);

  return {
    // Article methods
    getCachedArticle,
    getCachedArticleBySlug,
    getCachedArticles,
    getCachedCategories,
    
    // Cache storage
    cacheArticle,
    cacheCategory,
    cacheArticles,
    cacheSingleArticle,
    cacheCategories,
    
    // Cache updates
    updateCachedArticle,
    addCachedArticle,
    removeCachedArticle,
    
    // Cache validation
    needsRefresh,
    needsSingleArticleRefresh,
    onRefresh,
    onSingleArticleRefresh,
    triggerRefresh,
    
    // State
    isRefreshing,
    setIsRefreshing
  };
}

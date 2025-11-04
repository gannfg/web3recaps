'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { NewsArticle, NewsCategory, NewsFilters, Event } from '@/lib/news-types';
import { NewsNewspaperLayout } from './news-newspaper-layout';
import { NewsPagination } from './news-pagination';
import { Button } from '@/components/ui/button';
import { RefreshCw, Filter } from 'lucide-react';
import { useNewsCache } from '@/hooks/use-news-cache';
import { useApi } from '@/hooks/use-api';

export function NewsLandingPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
  page: 1,
  limit: 24,
    total: 0,
    total_pages: 0,
  });
  const [filters, setFilters] = useState<NewsFilters>({
    status: undefined, // Show all articles regardless of status
    sort_by: 'published_at',
    sort_order: 'desc',
    page: 1,
    limit: 24,
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const searchParams = useSearchParams();
  const { execute } = useApi();
  const {
    getCachedArticles,
    getCachedCategories,
    cacheArticles,
    cacheCategories,
    needsRefresh,
    onRefresh,
    triggerRefresh,
    isRefreshing,
    setIsRefreshing
  } = useNewsCache();

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        // Check cache first
        const cachedCategories = getCachedCategories();
        if (cachedCategories.length > 0) {
          setCategories(cachedCategories);
        }

        // Always fetch fresh data in background
        const result = await execute('/api/news/categories');
        if (result.success && result.data?.categories) {
          setCategories(result.data.categories);
          cacheCategories(result.data.categories);
        } else {
          console.error('Categories API Error:', result.error);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Load articles
  useEffect(() => {
    const loadArticles = async () => {
      setLoading(true);
      try {
        // Check cache first
        const cachedArticles = getCachedArticles(filters);
        if (cachedArticles && cachedArticles.length > 0) {
          setArticles(cachedArticles);
          setLoading(false);
          
          // Only refresh if data is stale and we haven't refreshed recently
          if (needsRefresh(filters)) {
            setIsRefreshing(true);
            onRefresh(filters);
          } else {
            // Data is fresh, no need to fetch
            return;
          }
        }

        // Build query params
        const queryParams = new URLSearchParams();
        if (filters.status) queryParams.set('status', filters.status);
        if (filters.is_breaking) queryParams.set('is_breaking', 'true');
        if (filters.is_featured) queryParams.set('is_featured', 'true');
        if (filters.search) queryParams.set('search', filters.search);
        if (filters.sort_by) queryParams.set('sort_by', filters.sort_by);
        if (filters.sort_order) queryParams.set('sort_order', filters.sort_order);
        if (filters.page) queryParams.set('page', filters.page.toString());
        if (filters.limit) queryParams.set('limit', filters.limit.toString());

        // Fetch fresh data
        const result = await execute(`/api/news?${queryParams.toString()}`);
        
        if (result.success && result.data) {
          const freshArticles = result.data.articles || [];
          setArticles(freshArticles);
          setPagination(result.data.pagination || pagination);
          cacheArticles(filters, freshArticles);
          onRefresh(filters);
        } else {
          console.error('API Error:', result.error);
          if (!cachedArticles) {
            setArticles([]);
          }
        }
      } catch (error) {
        console.error('Error loading articles:', error);
        if (!getCachedArticles(filters)) {
          setArticles([]);
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };

    loadArticles();
  }, [filters.status, filters.is_breaking, filters.is_featured, filters.search, filters.sort_by, filters.sort_order, pagination.page]); // Simplified dependencies

  // Load events
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await fetch('/api/events?status=published');
        const data = await response.json();
        
        if (data.success && data.data) {
          setEvents(data.data.events || []);
        } else {
          console.error('Events API Error:', data.error);
          setEvents([]);
        }
      } catch (error) {
        console.error('Error loading events:', error);
      }
    };

    loadEvents();
  }, []);

  // Handle URL parameters
  useEffect(() => {
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = searchParams.get('page');

    if (category || search || page) {
      setFilters(prev => ({
        ...prev,
        category_id: category || undefined,
        search: search || undefined,
        page: page ? parseInt(page) : 1,
      }));
    }
  }, [searchParams]);

  const handleCategoryChange = (categoryId: string | null) => {
    setFilters(prev => ({
      ...prev,
      category_id: categoryId || undefined,
      page: 1,
    }));
  };

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm || undefined,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      page,
    }));
  };

  const handleSortChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setFilters(prev => ({
      ...prev,
      sort_by: sortBy as any,
      sort_order: sortOrder,
      page: 1,
    }));
  };

  const handleRefresh = () => {
    triggerRefresh();
    setFilters(prev => ({ ...prev }));
  };


  return (
    <NewsNewspaperLayout
      articles={articles}
      events={events}
      categories={categories}
      loading={loading}
      onCategoryChange={handleCategoryChange}
      activeCategory={filters.category_id || null}
    />
  );
}

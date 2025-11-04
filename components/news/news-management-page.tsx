'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NewsArticle, NewsCategory, Event } from '@/lib/news-types';
import { NewsManagementHeader } from './news-management-header';
import { NewsManagementTable } from './news-management-table';
import { NewsManagementFilters } from './news-management-filters';
import { NewsLayoutBuilder } from './news-layout-builder';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/hooks/use-api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from '@/store/useSession';
import { MagazineManagement } from '@/components/magazine/magazine-management';

export function NewsManagementPage() {
  const { user } = useSession();
  const router = useRouter();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('articles');
  const [metrics, setMetrics] = useState({
    totalArticles: 0,
    publishedArticles: 0,
    totalViews: 0,
    totalLikes: 0,
  });
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | 'draft' | 'published' | 'archived',
    category: 'all',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });

  const { toast } = useToast();
  const { execute } = useApi();

  const calculateMetrics = (articles: NewsArticle[]) => {
    const totalArticles = articles.length;
    const publishedArticles = articles.filter(article => article.status === 'published').length;
    const totalViews = articles.reduce((sum, article) => sum + (article.view_count || 0), 0);
    const totalLikes = articles.reduce((sum, article) => sum + (article.like_count || 0), 0);
    
    return {
      totalArticles,
      publishedArticles,
      totalViews,
      totalLikes,
    };
  };

  useEffect(() => {
    loadData();
  }, [filters, pagination.page]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load categories
      const categoriesResult = await execute('/api/news/categories');
      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data.categories || []);
      }

      // Load articles
      const queryParams = new URLSearchParams();
      if (filters.status !== 'all') queryParams.set('status', filters.status);
      if (filters.category !== 'all') queryParams.set('category_id', filters.category);
      if (filters.search) queryParams.set('search', filters.search);
      queryParams.set('page', pagination.page.toString());
      queryParams.set('limit', pagination.limit.toString());
      
      console.log('Loading articles with filters:', filters);
      console.log('Query params:', queryParams.toString());
      console.log('Full API URL:', `/api/news?${queryParams.toString()}`);

      const articlesResult = await execute(`/api/news?${queryParams.toString()}`);
      console.log('Articles API response:', articlesResult);
      console.log('Articles API response success:', articlesResult.success);
      console.log('Articles API response data:', articlesResult.data);
      console.log('Articles API response error:', articlesResult.error);
      if (articlesResult.success && articlesResult.data) {
        console.log('Articles loaded:', articlesResult.data.articles?.length || 0, 'articles');
        console.log('Articles data:', articlesResult.data.articles);
        const loadedArticles = articlesResult.data.articles || [];
        setArticles(loadedArticles);
        setPagination(prev => ({
          ...prev,
          ...articlesResult.data.pagination,
        }));
        
        // Calculate metrics from loaded articles
        const newMetrics = calculateMetrics(loadedArticles);
        setMetrics(newMetrics);
      } else {
        console.error('Failed to load articles:', articlesResult.error);
      }

      // Load events for layout
      const eventsResult = await execute('/api/events?status=published');
      if (eventsResult.success && eventsResult.data) {
        setEvents(eventsResult.data.events || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load news data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = () => {
    router.push('/news/editor');
  };

  const handleEditArticle = (article: NewsArticle) => {
    router.push(`/news/editor?id=${article.id}`);
  };

  const handleViewArticle = (article: NewsArticle) => {
    router.push(`/news/${article.slug}`);
  };

  const handleDeleteArticle = async (article: NewsArticle) => {
    try {
      const result = await execute(`/api/news/${article.slug}`, {
        method: 'DELETE',
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Article archived successfully',
        });
        loadData(); // Reload the list
      } else {
        throw new Error(result.error || 'Failed to delete article');
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete article',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateArticleLayout = async (articleSlug: string, layoutPosition: string) => {
    try {
      const result = await execute(`/api/news/${articleSlug}/layout`, {
        method: 'PATCH',
        body: JSON.stringify({ layout_position: layoutPosition }),
      });
      
      if (result.success) {
        // Update the article in the local state
        setArticles(prev => prev.map(article => 
          article.slug === articleSlug 
            ? { ...article, layout_position: layoutPosition }
            : article
        ));
        
        toast({
          title: 'Success',
          description: 'Article layout position updated successfully.',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update article layout.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating article layout:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while updating the article layout.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleUpdateEventLayout = async (eventId: string, layoutPosition: string) => {
    try {
      const result = await execute(`/api/events/${eventId}/layout`, {
        method: 'PATCH',
        body: JSON.stringify({ layout_position: layoutPosition }),
      });
      
      if (result.success) {
        // Update the event in the local state
        setEvents(prev => prev.map(event => 
          event.id === eventId 
            ? { ...event, layout_position: layoutPosition }
            : event
        ));
        
        toast({
          title: 'Success',
          description: 'Event layout position updated successfully.',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update event layout.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating event layout:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while updating the event layout.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
    }));
    setPagination(prev => ({
      ...prev,
      page: 1, // Reset to first page when filtering
    }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({
      ...prev,
      page,
    }));
  };

  // Check authentication and role-based access
  useEffect(() => {
    if (user && (user.role !== 'Author' && user.role !== 'Admin' && user.role !== 'AUTHOR' && user.role !== 'ADMIN')) {
      router.push('/');
      return;
    }
  }, [user, router]);

  if (!user || (user.role !== 'Author' && user.role !== 'Admin' && user.role !== 'AUTHOR' && user.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need Author or Admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Management Header */}
      <NewsManagementHeader
        onCreateArticle={handleCreateArticle}
        totalArticles={metrics.totalArticles}
        publishedArticles={metrics.publishedArticles}
        totalViews={metrics.totalViews}
        totalLikes={metrics.totalLikes}
        loading={loading}
      />

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="layout">Layout Manager</TabsTrigger>
            <TabsTrigger value="magazines">Magazines</TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="space-y-6">
            {/* Filters */}
            <NewsManagementFilters
              filters={filters}
              categories={categories}
              onFilterChange={handleFilterChange}
            />

            {/* Articles Table */}
            <NewsManagementTable
              articles={articles}
              loading={loading}
              onEdit={handleEditArticle}
              onView={handleViewArticle}
              onDelete={handleDeleteArticle}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </TabsContent>

          <TabsContent value="layout">
            <NewsLayoutBuilder
              articles={articles.filter(article => article.status === 'published')}
              events={events}
              onUpdateArticleLayout={handleUpdateArticleLayout}
              onUpdateEventLayout={handleUpdateEventLayout}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="magazines">
            <MagazineManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


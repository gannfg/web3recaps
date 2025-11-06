'use client';

import { useState, useEffect } from 'react';
import { NewsArticle, NewsCategory, Event } from '@/lib/news-types';
import { NewsLayoutBuilder } from './news-layout-builder';
import { Button } from '@/components/ui/button';
import { RefreshCw, Eye, Settings } from 'lucide-react';
import { useApi } from '@/hooks/use-api';

export function NewsLayoutManagePage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { execute } = useApi();

  const loadArticles = async () => {
    try {
      const result = await execute('/api/news?status=published');
      if (result.success) {
        setArticles(result.data.articles || []);
      }
    } catch (error) {
      console.error('Error loading articles:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const result = await execute('/api/events?status=published');
      if (result.success) {
        setEvents(result.data.events || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await execute('/api/news/categories');
      if (result.success) {
        setCategories(result.data.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleUpdateArticleLayout = async (articleId: string, layoutPosition: string) => {
    try {
      const result = await execute(`/api/news/${articleId}/layout`, {
        method: 'PATCH',
        body: JSON.stringify({ layout_position: layoutPosition }),
      });
      
      if (result.success) {
        // Update the article in the local state
        setArticles(prev => prev.map(article => 
          article.id === articleId 
            ? { ...article, layout_position: layoutPosition }
            : article
        ));
      }
    } catch (error) {
      console.error('Error updating article layout:', error);
      throw error;
    }
  };

  const handleUpdateArticleFeatured = async (articleId: string, isFeatured: boolean) => {
    try {
      const result = await execute(`/api/news/${articleId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_featured: isFeatured }),
      });
      
      if (result.success) {
        // Update the article in the local state
        setArticles(prev => prev.map(article => 
          article.id === articleId 
            ? { ...article, is_featured: isFeatured }
            : article
        ));
      }
    } catch (error) {
      console.error('Error updating article featured status:', error);
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
      }
    } catch (error) {
      console.error('Error updating event layout:', error);
      throw error;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadArticles(), loadEvents(), loadCategories()]);
    setRefreshing(false);
  };

  useEffect(() => {
    let cancelled = false;
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Load all data in parallel with error handling
        const [articlesResult, eventsResult, categoriesResult] = await Promise.allSettled([
          loadArticles(),
          loadEvents(),
          loadCategories()
        ]);
        
        if (!cancelled) {
          // Handle any errors gracefully
          if (articlesResult.status === 'rejected') {
            console.error('Failed to load articles:', articlesResult.reason);
          }
          if (eventsResult.status === 'rejected') {
            console.error('Failed to load events:', eventsResult.reason);
          }
          if (categoriesResult.status === 'rejected') {
            console.error('Failed to load categories:', categoriesResult.reason);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading data:', error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Layout Manager</h1>
          <p className="text-muted-foreground mt-2">
            Manage article positions on the news front page
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/news', '_blank')}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview Front Page
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold text-foreground">
            {articles.length}
          </div>
          <div className="text-sm text-muted-foreground">Total Articles</div>
        </div>
        
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold text-foreground">
            {articles.filter(a => a.layout_position?.startsWith('featured_')).length}
          </div>
          <div className="text-sm text-muted-foreground">Featured Articles</div>
        </div>
        
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold text-foreground">
            {articles.filter(a => a.layout_position?.startsWith('secondary_')).length}
          </div>
          <div className="text-sm text-muted-foreground">Secondary Articles</div>
        </div>
        
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold text-foreground">
            {articles.filter(a => !a.layout_position).length}
          </div>
          <div className="text-sm text-muted-foreground">Regular Articles</div>
        </div>
      </div>

      {/* Layout Builder */}
      <NewsLayoutBuilder
        articles={articles}
        events={events}
        onUpdateArticleLayout={handleUpdateArticleLayout}
        onUpdateEventLayout={handleUpdateEventLayout}
        onUpdateArticleFeatured={handleUpdateArticleFeatured}
        loading={loading}
      />
    </div>
  );
}

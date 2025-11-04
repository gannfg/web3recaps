/**
 * High-performance engagement hook with optimistic updates and caching
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useApi } from './use-api';

export interface EngagementData {
  isLiked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  commentCount: number;
  shareCount?: number;
}

export interface EngagementConfig {
  entityId: string;
  entityType: 'article' | 'post' | 'project' | 'event';
  initialData: EngagementData;
  onUpdate?: (data: EngagementData) => void;
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Client-side cache for engagement data
const engagementCache = new Map<string, EngagementData>();

export function useEngagement({ entityId, entityType, initialData, onUpdate }: EngagementConfig) {
  const { execute } = useApi();
  const [data, setData] = useState<EngagementData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs to prevent race conditions
  const pendingActions = useRef<Set<string>>(new Set());
  const lastActionTime = useRef<number>(0);
  const onUpdateRef = useRef(onUpdate);
  
  // Cache key for this entity
  const cacheKey = `${entityType}-${entityId}`;
  
  // Update onUpdate ref when it changes
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);
  
  // Load from cache on mount
  useEffect(() => {
    const cached = engagementCache.get(cacheKey);
    if (cached) {
      setData(cached);
    }
  }, [cacheKey]);

  // Update cache when data changes
  useEffect(() => {
    engagementCache.set(cacheKey, data);
  }, [cacheKey, data]);

  // Optimistic update function
  const updateOptimistically = useCallback((updates: Partial<EngagementData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates };
      // Call onUpdate after state update
      setTimeout(() => onUpdateRef.current?.(newData), 0);
      return newData;
    });
  }, []);

  // Revert optimistic update on error
  const revertOptimistic = useCallback((originalData: EngagementData) => {
    setData(originalData);
  }, []);

  // Debounced API call for likes
  const debouncedLike = useRef(
    debounce(async (liked: boolean, originalData: EngagementData) => {
      try {
        setIsLoading(true);
        setError(null);
        
        const endpoint = `/api/${entityType}s/${entityId}/like`;
        const result = await execute(endpoint, {
          method: 'POST',
          body: JSON.stringify({ liked }),
        });

        if (!result.success) {
          // Revert optimistic update on error
          revertOptimistic(originalData);
          setError(result.error || 'Failed to update like');
        }
      } catch (err) {
        revertOptimistic(originalData);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
        pendingActions.current.delete('like');
      }
    }, 300)
  ).current;

  // Debounced API call for bookmarks
  const debouncedBookmark = useRef(
    debounce(async (bookmarked: boolean, originalData: EngagementData) => {
      try {
        setIsLoading(true);
        setError(null);
        
        const endpoint = `/api/${entityType}s/${entityId}/bookmark`;
        const result = await execute(endpoint, {
          method: 'POST',
          body: JSON.stringify({ bookmarked }),
        });

        if (!result.success) {
          revertOptimistic(originalData);
          setError(result.error || 'Failed to update bookmark');
        }
      } catch (err) {
        revertOptimistic(originalData);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
        pendingActions.current.delete('bookmark');
      }
    }, 300)
  ).current;

  // Like action with optimistic updates
  const toggleLike = useCallback(() => {
    // Prevent rapid clicking
    const now = Date.now();
    if (now - lastActionTime.current < 100) return;
    lastActionTime.current = now;

    // Prevent duplicate actions
    if (pendingActions.current.has('like')) return;
    pendingActions.current.add('like');

    const originalData = { ...data };
    const newLiked = !data.isLiked;
    const newLikeCount = data.likeCount + (newLiked ? 1 : -1);

    // Optimistic update
    updateOptimistically({
      isLiked: newLiked,
      likeCount: Math.max(0, newLikeCount),
    });

    // Debounced API call
    debouncedLike(newLiked, originalData);
  }, [data, updateOptimistically, debouncedLike]);

  // Bookmark action with optimistic updates
  const toggleBookmark = useCallback(() => {
    // Prevent rapid clicking
    const now = Date.now();
    if (now - lastActionTime.current < 100) return;
    lastActionTime.current = now;

    // Prevent duplicate actions
    if (pendingActions.current.has('bookmark')) return;
    pendingActions.current.add('bookmark');

    const originalData = { ...data };
    const newBookmarked = !data.isBookmarked;

    // Optimistic update
    updateOptimistically({
      isBookmarked: newBookmarked,
    });

    // Debounced API call
    debouncedBookmark(newBookmarked, originalData);
  }, [data, updateOptimistically, debouncedBookmark]);

  // Share action (no API call needed)
  const share = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: window.location.href,
        });
        
        // Optional: Track share event
        // await execute(`/${entityType}s/${entityId}/share`, { method: 'POST' });
      } catch (error) {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
    }
  }, [entityId, entityType]);

  // Refresh data from server
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const endpoint = `/${entityType}s/${entityId}`;
      const result = await execute(endpoint);
      
      if (result.success && result.data) {
        const serverData: EngagementData = {
          isLiked: result.data.is_liked || false,
          isBookmarked: result.data.is_bookmarked || false,
          likeCount: result.data.like_count || 0,
          commentCount: result.data.comment_count || 0,
          shareCount: result.data.share_count || 0,
        };
        
        setData(serverData);
        onUpdate?.(serverData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [entityId, entityType, execute, onUpdate]);

  // Clear cache for this entity
  const clearCache = useCallback(() => {
    engagementCache.delete(cacheKey);
  }, [cacheKey]);

  return {
    data,
    isLoading,
    error,
    actions: {
      toggleLike,
      toggleBookmark,
      share,
      refresh,
      clearCache,
    },
  };
}

// Utility hook for batch engagement operations
export function useBatchEngagement(entityIds: string[], entityType: 'article' | 'post' | 'project' | 'event') {
  const { execute } = useApi();
  const [data, setData] = useState<Record<string, EngagementData>>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadBatch = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Batch API call to get all engagement data at once
      const result = await execute(`/${entityType}s/batch-engagement`, {
        method: 'POST',
        body: JSON.stringify({ ids: entityIds }),
      });

      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to load batch engagement data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [entityIds, entityType, execute]);

  useEffect(() => {
    if (entityIds.length > 0) {
      loadBatch();
    }
  }, [loadBatch]);

  return {
    data,
    isLoading,
    refresh: loadBatch,
  };
}

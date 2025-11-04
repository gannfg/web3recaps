/**
 * Smart caching hook for feed data with stale-while-revalidate pattern
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Post, User } from '@/lib/types'

interface CacheEntry<T> {
  data: T
  timestamp: number
  stale: boolean
}

interface FeedCache {
  posts: Map<string, CacheEntry<Post>>
  users: Map<string, CacheEntry<User>>
  feedPages: Map<number, CacheEntry<Post[]>>
}

// Global cache instance
const feedCache: FeedCache = {
  posts: new Map(),
  users: new Map(),
  feedPages: new Map()
}

// Cache configuration
const CACHE_CONFIG = {
  // How long data stays fresh (5 minutes)
  FRESH_DURATION: 5 * 60 * 1000,
  // How long data stays in cache (30 minutes)
  MAX_AGE: 30 * 60 * 1000,
  // How long to wait before background refresh (2 minutes)
  STALE_WHILE_REVALIDATE: 2 * 60 * 1000,
  // Max cache size
  MAX_POSTS: 100,
  MAX_USERS: 50,
  MAX_PAGES: 20
}

export function useFeedCache() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshCallbacks = useRef<Set<() => void>>(new Set())

  // Check if data is fresh
  const isFresh = useCallback((timestamp: number): boolean => {
    return Date.now() - timestamp < CACHE_CONFIG.FRESH_DURATION
  }, [])

  // Check if data is stale but usable
  const isStale = useCallback((timestamp: number): boolean => {
    const age = Date.now() - timestamp
    return age > CACHE_CONFIG.FRESH_DURATION && age < CACHE_CONFIG.MAX_AGE
  }, [])

  // Check if data is expired
  const isExpired = useCallback((timestamp: number): boolean => {
    return Date.now() - timestamp > CACHE_CONFIG.MAX_AGE
  }, [])

  // Get cached posts for a page
  const getCachedPosts = useCallback((page: number): Post[] | null => {
    const entry = feedCache.feedPages.get(page)
    if (!entry) return null

    if (isExpired(entry.timestamp)) {
      feedCache.feedPages.delete(page)
      return null
    }

    // Mark as stale if needed
    if (isStale(entry.timestamp)) {
      entry.stale = true
    }

    return entry.data
  }, [isExpired, isStale])

  // Get cached user
  const getCachedUser = useCallback((userId: string): User | null => {
    const entry = feedCache.users.get(userId)
    if (!entry) return null

    if (isExpired(entry.timestamp)) {
      feedCache.users.delete(userId)
      return null
    }

    if (isStale(entry.timestamp)) {
      entry.stale = true
    }

    return entry.data
  }, [isExpired, isStale])

  // Cache posts for a page
  const cachePosts = useCallback((page: number, posts: Post[]) => {
    // Clean up old pages if we have too many
    if (feedCache.feedPages.size >= CACHE_CONFIG.MAX_PAGES) {
      const oldestPage = Math.min(...Array.from(feedCache.feedPages.keys()))
      feedCache.feedPages.delete(oldestPage)
    }

    feedCache.feedPages.set(page, {
      data: posts,
      timestamp: Date.now(),
      stale: false
    })

    // Also cache individual posts
    posts.forEach(post => {
      if (feedCache.posts.size >= CACHE_CONFIG.MAX_POSTS) {
        // Remove oldest post (safely guard against undefined)
        const iter = feedCache.posts.keys().next()
        if (!iter.done) {
          feedCache.posts.delete(iter.value)
        }
      }

      feedCache.posts.set(post.id, {
        data: post,
        timestamp: Date.now(),
        stale: false
      })
    })
  }, [])

  // Cache user data
  const cacheUser = useCallback((user: User) => {
    if (feedCache.users.size >= CACHE_CONFIG.MAX_USERS) {
      // Remove oldest user (safely guard against undefined)
      const iter = feedCache.users.keys().next()
      if (!iter.done) {
        feedCache.users.delete(iter.value)
      }
    }

    feedCache.users.set(user.id, {
      data: user,
      timestamp: Date.now(),
      stale: false
    })
  }, [])

  // Get all cached users
  const getCachedUsers = useCallback((): Record<string, User> => {
    const users: Record<string, User> = {}
    
    feedCache.users.forEach((entry, userId) => {
      if (!isExpired(entry.timestamp)) {
        users[userId] = entry.data
        if (isStale(entry.timestamp)) {
          entry.stale = true
        }
      }
    })

    return users
  }, [isExpired, isStale])

  // Check if we need to refresh stale data
  const needsRefresh = useCallback((page: number): boolean => {
    const entry = feedCache.feedPages.get(page)
    if (!entry) return true

    const age = Date.now() - entry.timestamp
    return age > CACHE_CONFIG.STALE_WHILE_REVALIDATE
  }, [])

  // Register refresh callback
  const onRefresh = useCallback((callback: () => void) => {
    refreshCallbacks.current.add(callback)
    return () => refreshCallbacks.current.delete(callback)
  }, [])

  // Trigger refresh for all callbacks
  const triggerRefresh = useCallback(() => {
    refreshCallbacks.current.forEach(callback => callback())
  }, [])

  // Update post in cache (for optimistic updates)
  const updateCachedPost = useCallback((postId: string, updates: Partial<Post>) => {
    const entry = feedCache.posts.get(postId)
    if (entry) {
      entry.data = { ...entry.data, ...updates }
      entry.timestamp = Date.now()
    }

    // Also update in page cache
    feedCache.feedPages.forEach((pageEntry) => {
      const postIndex = pageEntry.data.findIndex(p => p.id === postId)
      if (postIndex !== -1) {
        pageEntry.data[postIndex] = { ...pageEntry.data[postIndex], ...updates }
        pageEntry.timestamp = Date.now()
      }
    })
  }, [])

  // Add new post to cache
  const addCachedPost = useCallback((post: Post) => {
    // Add to posts cache
    feedCache.posts.set(post.id, {
      data: post,
      timestamp: Date.now(),
      stale: false
    })

    // Add to first page
    const firstPage = feedCache.feedPages.get(0)
    if (firstPage) {
      firstPage.data.unshift(post)
      firstPage.timestamp = Date.now()
    }
  }, [])

  // Remove post from cache
  const removeCachedPost = useCallback((postId: string) => {
    feedCache.posts.delete(postId)
    
    // Remove from all pages
    feedCache.feedPages.forEach((pageEntry) => {
      const postIndex = pageEntry.data.findIndex(p => p.id === postId)
      if (postIndex !== -1) {
        pageEntry.data.splice(postIndex, 1)
        pageEntry.timestamp = Date.now()
      }
    })
  }, [])

  // Clear all cache
  const clearCache = useCallback(() => {
    feedCache.posts.clear()
    feedCache.users.clear()
    feedCache.feedPages.clear()
  }, [])

  // Get cache stats
  const getCacheStats = useCallback(() => {
    return {
      posts: feedCache.posts.size,
      users: feedCache.users.size,
      pages: feedCache.feedPages.size,
      memoryUsage: {
        posts: feedCache.posts.size * 1024, // Rough estimate
        users: feedCache.users.size * 512,
        pages: feedCache.feedPages.size * 2048
      }
    }
  }, [])

  return {
    // Getters
    getCachedPosts,
    getCachedUser,
    getCachedUsers,
    needsRefresh,
    
    // Setters
    cachePosts,
    cacheUser,
    updateCachedPost,
    addCachedPost,
    removeCachedPost,
    
    // Cache management
    clearCache,
    getCacheStats,
    
    // Refresh system
    onRefresh,
    triggerRefresh,
    isRefreshing,
    setIsRefreshing
  }
}

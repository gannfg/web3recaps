/**
 * API Response Cache System
 * Provides client-side API response caching to reduce server load
 */

interface CachedResponse<T = any> {
  data: T
  timestamp: number
  etag?: string
  maxAge: number
}

interface CacheConfig {
  maxSize: number // Maximum cache size in bytes
  maxAge: number // Default max age in milliseconds
  maxEntries: number // Maximum number of entries
}

class ApiCache {
  private cache = new Map<string, CachedResponse>()
  private config: CacheConfig = {
    maxSize: 10 * 1024 * 1024, // 10MB
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 100
  }

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  /**
   * Generate cache key from URL and params
   */
  private getCacheKey(url: string, params?: Record<string, any>): string {
    const sortedParams = params ? Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&') : ''
    
    return `${url}${sortedParams ? `?${sortedParams}` : ''}`
  }

  /**
   * Get cached response or null if not found/expired
   */
  get<T>(url: string, params?: Record<string, any>): T | null {
    const key = this.getCacheKey(url, params)
    const cached = this.cache.get(key)
    
    if (!cached) return null
    
    const now = Date.now()
    if ((now - cached.timestamp) > cached.maxAge) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data as T
  }

  /**
   * Set cached response
   */
  set<T>(
    url: string, 
    data: T, 
    params?: Record<string, any>,
    maxAge?: number
  ): void {
    const key = this.getCacheKey(url, params)
    const now = Date.now()
    
    this.cache.set(key, {
      data,
      timestamp: now,
      maxAge: maxAge || this.config.maxAge
    })
    
    // Cleanup if needed
    this.cleanup()
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern: string | RegExp): void {
    const keys = Array.from(this.cache.keys())
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    
    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    })
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clean up expired and oversized cache
   */
  private cleanup(): void {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    
    // Remove expired entries
    entries.forEach(([key, cached]) => {
      if ((now - cached.timestamp) > cached.maxAge) {
        this.cache.delete(key)
      }
    })

    // If still over limits, remove oldest entries
    if (this.cache.size > this.config.maxEntries) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      
      const toRemove = sortedEntries.slice(0, this.cache.size - this.config.maxEntries)
      toRemove.forEach(([key]) => {
        this.cache.delete(key)
      })
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      count: this.cache.size,
      maxEntries: this.config.maxEntries,
      maxSize: this.config.maxSize
    }
  }
}

// Global API cache instance
export const apiCache = new ApiCache()

/**
 * Enhanced fetch with caching
 */
export async function cachedFetch<T = any>(
  url: string,
  options: RequestInit & {
    cache?: boolean
    cacheMaxAge?: number
    params?: Record<string, any>
  } = {}
): Promise<T> {
  const { cache = true, cacheMaxAge, params, ...fetchOptions } = options
  
  // Check cache first
  if (cache) {
    const cached = apiCache.get<T>(url, params)
    if (cached) {
      return cached
    }
  }

  // Fetch from server
  const response = await fetch(url, fetchOptions)
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  
  // Cache the response
  if (cache) {
    apiCache.set(url, data, params, cacheMaxAge)
  }
  
  return data
}

/**
 * Hook for using API cache in React components
 */
export function useApiCache() {
  const getCachedData = <T>(url: string, params?: Record<string, any>): T | null => {
    return apiCache.get<T>(url, params)
  }

  const setCachedData = <T>(
    url: string, 
    data: T, 
    params?: Record<string, any>,
    maxAge?: number
  ): void => {
    apiCache.set(url, data, params, maxAge)
  }

  const invalidateCache = (pattern: string | RegExp): void => {
    apiCache.invalidate(pattern)
  }

  const clearCache = (): void => {
    apiCache.clear()
  }

  const getCacheStats = () => {
    return apiCache.getStats()
  }

  return {
    getCachedData,
    setCachedData,
    invalidateCache,
    clearCache,
    getCacheStats
  }
}

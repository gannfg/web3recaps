/**
 * Performance Optimization Utilities
 * Collection of utilities to optimize API responses and reduce payload sizes
 */

import { apiCache } from './api-cache'

/**
 * Optimize image URLs for better performance
 */
export function optimizeImageUrl(
  url: string, 
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'jpeg' | 'png'
  } = {}
): string {
  if (!url || url.startsWith('data:')) return url

  const { width, height, quality = 80, format = 'webp' } = options
  
  // If it's a Supabase Storage URL, add optimization parameters
  if (url.includes('supabase.co/storage')) {
    const urlObj = new URL(url)
    const params = new URLSearchParams()
    
    if (width) params.set('width', width.toString())
    if (height) params.set('height', height.toString())
    if (quality) params.set('quality', quality.toString())
    if (format) params.set('format', format)
    
    // Add cache control
    params.set('cache', '3600')
    
    return `${url}?${params.toString()}`
  }
  
  return url
}

/**
 * Compress and optimize data for API responses
 */
export function optimizeApiResponse<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map(item => optimizeApiResponse(item)) as T
  }
  
  if (data && typeof data === 'object') {
    const optimized = { ...data } as Record<string, any>
    
    // Remove unnecessary fields that bloat the response
    const fieldsToRemove = [
      'created_at', // Keep only updated_at if needed
      'updated_at', // Keep only if recently updated
      'internal_notes',
      'debug_info',
      'temp_data'
    ]
    
    fieldsToRemove.forEach(field => {
      if (field in optimized) {
        delete optimized[field]
      }
    })
    
    // Optimize image URLs in the response
    if ('avatar_url' in optimized && typeof optimized.avatar_url === 'string') {
      optimized.avatar_url = optimizeImageUrl(optimized.avatar_url, { width: 100, height: 100 })
    }
    
    if ('banner_url' in optimized && typeof optimized.banner_url === 'string') {
      optimized.banner_url = optimizeImageUrl(optimized.banner_url, { width: 800, height: 400 })
    }
    
    if ('images' in optimized && Array.isArray(optimized.images)) {
      optimized.images = optimized.images.map((img: string) => 
        optimizeImageUrl(img, { width: 600, height: 400 })
      )
    }
    
    return optimized as T
  }
  
  return data
}

/**
 * Pagination helper to limit response sizes
 */
export function paginateData<T>(
  data: T[], 
  page: number = 1, 
  limit: number = 20
): {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
} {
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedData = data.slice(startIndex, endIndex)
  
  return {
    data: paginatedData,
    pagination: {
      page,
      limit,
      total: data.length,
      totalPages: Math.ceil(data.length / limit),
      hasNext: endIndex < data.length,
      hasPrev: page > 1
    }
  }
}

/**
 * Debounce function for search and filtering
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function for scroll and resize events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Lazy load data with caching
 */
export async function lazyLoadData<T>(
  url: string,
  params?: Record<string, any>,
  options: {
    cache?: boolean
    cacheMaxAge?: number
    fallback?: T
  } = {}
): Promise<T> {
  const { cache = true, cacheMaxAge, fallback } = options
  
  try {
    // Check cache first
    if (cache) {
      const cached = apiCache.get<T>(url, params)
      if (cached) {
        return cached
      }
    }
    
    // Fetch from server
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    const optimizedData = optimizeApiResponse(data.data || data)
    
    // Cache the response
    if (cache) {
      apiCache.set(url, optimizedData, params, cacheMaxAge)
    }
    
    return optimizedData
  } catch (error) {
    console.error('Failed to load data:', error)
    if (fallback) {
      return fallback
    }
    throw error
  }
}

/**
 * Preload critical data
 */
export async function preloadCriticalData(urls: string[]): Promise<void> {
  const promises = urls.map(url => 
    lazyLoadData(url, {}, { cache: true, cacheMaxAge: 10 * 60 * 1000 }) // 10 minutes
  )
  
  await Promise.allSettled(promises)
}

/**
 * Optimize database queries by adding common filters
 */
export function optimizeQuery(query: any, options: {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  select?: string[]
} = {}) {
  const { 
    limit = 20, 
    offset = 0, 
    orderBy = 'created_at', 
    orderDirection = 'desc',
    select = ['*']
  } = options
  
  return query
    .select(select.join(', '))
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .range(offset, offset + limit - 1)
}

/**
 * Memory usage monitor
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor
  private observers: ((info: any) => void)[] = []
  
  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor()
    }
    return MemoryMonitor.instance
  }
  
  startMonitoring(interval: number = 30000): void {
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const info = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        }
        
        this.observers.forEach(observer => observer(info))
        
        // Warn if memory usage is high
        if (info.percentage > 80) {
          console.warn('High memory usage detected:', info)
        }
      }
    }, interval)
  }
  
  subscribe(observer: (info: any) => void): () => void {
    this.observers.push(observer)
    return () => {
      const index = this.observers.indexOf(observer)
      if (index > -1) {
        this.observers.splice(index, 1)
      }
    }
  }
}

/**
 * Performance metrics collector
 */
export class PerformanceMetrics {
  private static metrics: Map<string, number[]> = new Map()
  
  static recordTiming(name: string, duration: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const timings = this.metrics.get(name)!
    timings.push(duration)
    
    // Keep only last 100 measurements
    if (timings.length > 100) {
      timings.shift()
    }
  }
  
  static getAverageTiming(name: string): number {
    const timings = this.metrics.get(name)
    if (!timings || timings.length === 0) return 0
    
    return timings.reduce((sum, timing) => sum + timing, 0) / timings.length
  }
  
  static getMetrics(): Record<string, { average: number; count: number; latest: number }> {
    const result: Record<string, { average: number; count: number; latest: number }> = {}
    
    this.metrics.forEach((timings, name) => {
      result[name] = {
        average: this.getAverageTiming(name),
        count: timings.length,
        latest: timings[timings.length - 1] || 0
      }
    })
    
    return result
  }
  
  static clearMetrics(): void {
    this.metrics.clear()
  }
}

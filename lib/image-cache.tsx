/**
 * Local Image Cache System
 * Provides client-side image caching to reduce repeated downloads
 */

interface CachedImage {
  url: string
  blob: Blob
  timestamp: number
  size: number
}

interface ImageCacheConfig {
  maxSize: number // Maximum cache size in bytes
  maxAge: number // Maximum age in milliseconds
  maxImages: number // Maximum number of images to cache
}

class ImageCache {
  private cache = new Map<string, CachedImage>()
  private config: ImageCacheConfig = {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxImages: 100
  }

  constructor(config?: Partial<ImageCacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  /**
   * Get cached image or fetch and cache it
   */
  async getImage(url: string): Promise<string> {
    // Check if image is already cached
    const cached = this.cache.get(url)
    if (cached && this.isValid(cached)) {
      return URL.createObjectURL(cached.blob)
    }

    // Remove expired cache entry
    if (cached) {
      this.cache.delete(url)
    }

    // Fetch and cache the image
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }

      const blob = await response.blob()
      const timestamp = Date.now()

      // Check if we need to clean up cache
      this.cleanup()

      // Cache the image
      this.cache.set(url, {
        url,
        blob,
        timestamp,
        size: blob.size
      })

      return URL.createObjectURL(blob)
    } catch (error) {
      console.error('Failed to cache image:', error)
      return url // Fallback to original URL
    }
  }

  /**
   * Preload images for better performance
   */
  async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.getImage(url))
    await Promise.allSettled(promises)
  }

  /**
   * Check if cached image is still valid
   */
  private isValid(cached: CachedImage): boolean {
    const now = Date.now()
    return (now - cached.timestamp) < this.config.maxAge
  }

  /**
   * Clean up cache based on size and age
   */
  private cleanup(): void {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    
    // Remove expired entries
    entries.forEach(([url, cached]) => {
      if ((now - cached.timestamp) >= this.config.maxAge) {
        this.cache.delete(url)
        URL.revokeObjectURL(URL.createObjectURL(cached.blob))
      }
    })

    // If still over limits, remove oldest entries
    if (this.cache.size > this.config.maxImages) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      
      const toRemove = sortedEntries.slice(0, this.cache.size - this.config.maxImages)
      toRemove.forEach(([url, cached]) => {
        this.cache.delete(url)
        URL.revokeObjectURL(URL.createObjectURL(cached.blob))
      })
    }

    // Check total size
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, cached) => sum + cached.size, 0)
    
    if (totalSize > this.config.maxSize) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      
      let currentSize = totalSize
      for (const [url, cached] of sortedEntries) {
        if (currentSize <= this.config.maxSize) break
        
        this.cache.delete(url)
        URL.revokeObjectURL(URL.createObjectURL(cached.blob))
        currentSize -= cached.size
      }
    }
  }

  /**
   * Clear all cached images
   */
  clear(): void {
    this.cache.forEach((cached) => {
      URL.revokeObjectURL(URL.createObjectURL(cached.blob))
    })
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values())
    return {
      count: this.cache.size,
      totalSize: entries.reduce((sum, cached) => sum + cached.size, 0),
      maxSize: this.config.maxSize,
      maxImages: this.config.maxImages
    }
  }
}

// Global image cache instance
export const imageCache = new ImageCache()

/**
 * Hook for using image cache in React components
 */
export function useImageCache() {
  const getCachedImage = async (url: string): Promise<string> => {
    return await imageCache.getImage(url)
  }

  const preloadImages = async (urls: string[]): Promise<void> => {
    return await imageCache.preloadImages(urls)
  }

  const clearCache = () => {
    imageCache.clear()
  }

  const getCacheStats = () => {
    return imageCache.getStats()
  }

  return {
    getCachedImage,
    preloadImages,
    clearCache,
    getCacheStats
  }
}

/**
 * Optimized Image Component with caching
 */
export function CachedImage({
  src,
  alt,
  className,
  ...props
}: {
  src: string
  alt: string
  className?: string
  [key: string]: any
}) {
  const [cachedSrc, setCachedSrc] = React.useState<string>(src)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    if (!src) return

    setIsLoading(true)
    setError(false)

    imageCache.getImage(src)
      .then((cachedUrl) => {
        setCachedSrc(cachedUrl)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load cached image:', err)
        setCachedSrc(src) // Fallback to original
        setError(true)
        setIsLoading(false)
      })
  }, [src])

  if (error) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-sm">Failed to load image</span>
      </div>
    )
  }

  return (
    <img
      src={cachedSrc}
      alt={alt}
      className={className}
      loading="lazy"
      {...props}
    />
  )
}

// Add React import for the component
import React from 'react'

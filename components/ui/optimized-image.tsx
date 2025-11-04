'use client'

import { useState, useEffect, useRef } from 'react'
import { useImageCache } from '@/lib/image-cache'
import { optimizeImageUrl } from '@/lib/performance-optimizations'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
  className?: string
  priority?: boolean
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  loading?: 'lazy' | 'eager'
  onLoad?: () => void
  onError?: () => void
  fallback?: React.ReactNode
  [key: string]: any
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = 80,
  format = 'webp',
  className,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  loading = 'lazy',
  onLoad,
  onError,
  fallback,
  ...props
}: OptimizedImageProps) {
  const { getCachedImage } = useImageCache()
  const [imageSrc, setImageSrc] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLImageElement>(null)

  // Optimize the source URL
  const optimizedSrc = optimizeImageUrl(src, {
    width,
    height,
    quality,
    format
  })

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || loading === 'eager') {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '50px' }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [priority, loading])

  // Load and cache image
  useEffect(() => {
    if (!isInView || !optimizedSrc) return

    setIsLoading(true)
    setHasError(false)

    getCachedImage(optimizedSrc)
      .then((cachedUrl) => {
        setImageSrc(cachedUrl)
        setIsLoading(false)
        onLoad?.()
      })
      .catch((error) => {
        console.error('Failed to load image:', error)
        setHasError(true)
        setIsLoading(false)
        onError?.()
      })
  }, [isInView, optimizedSrc, getCachedImage, onLoad, onError])

  // Handle image load
  const handleImageLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  // Handle image error
  const handleImageError = () => {
    setHasError(true)
    setIsLoading(false)
    onError?.()
  }

  // Show loading skeleton
  if (isLoading && !hasError) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <Skeleton 
          className={cn(
            'w-full h-full',
            width && height ? '' : 'aspect-square'
          )}
          style={width && height ? { width, height } : undefined}
        />
        {placeholder === 'blur' && blurDataURL && (
          <img
            src={blurDataURL}
            alt=""
            className="absolute inset-0 w-full h-full object-cover blur-sm scale-110"
            aria-hidden="true"
          />
        )}
      </div>
    )
  }

  // Show error fallback
  if (hasError) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          className
        )}
        style={width && height ? { width, height } : undefined}
      >
        <div className="text-center">
          <div className="text-2xl mb-2">🖼️</div>
          <div className="text-sm">Failed to load</div>
        </div>
      </div>
    )
  }

  // Show optimized image
  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={cn('transition-opacity duration-200', className)}
      loading={loading}
      sizes={sizes}
      onLoad={handleImageLoad}
      onError={handleImageError}
      {...props}
    />
  )
}

// Avatar component with optimization
interface OptimizedAvatarProps {
  src?: string
  alt: string
  fallback?: string
  size?: number
  className?: string
}

export function OptimizedAvatar({
  src,
  alt,
  fallback,
  size = 40,
  className
}: OptimizedAvatarProps) {
  return (
    <OptimizedImage
      src={src || ''}
      alt={alt}
      width={size}
      height={size}
      quality={90}
      format="webp"
      className={cn('rounded-full', className)}
      fallback={
        <div 
          className={cn(
            'flex items-center justify-center bg-muted text-muted-foreground rounded-full',
            className
          )}
          style={{ width: size, height: size }}
        >
          {fallback || alt.substring(0, 2).toUpperCase()}
        </div>
      }
    />
  )
}

// Background image component with optimization
interface OptimizedBackgroundImageProps {
  src: string
  alt: string
  children: React.ReactNode
  className?: string
  overlay?: boolean
  overlayOpacity?: number
}

export function OptimizedBackgroundImage({
  src,
  alt,
  children,
  className,
  overlay = false,
  overlayOpacity = 0.5
}: OptimizedBackgroundImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const { getCachedImage } = useImageCache()

  useEffect(() => {
    if (!src) return

    getCachedImage(src)
      .then(setImageSrc)
      .catch(() => setImageSrc(''))
      .finally(() => setIsLoading(false))
  }, [src, getCachedImage])

  return (
    <div 
      className={cn('relative overflow-hidden', className)}
      style={{
        backgroundImage: imageSrc ? `url(${imageSrc})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {overlay && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      <div className="relative z-10">
        {children}
      </div>
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  )
}

/**
 * Image optimization utilities for consistent image handling
 */

export interface ImageOptimizationOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'avif' | 'jpeg' | 'png'
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
}

/**
 * Generate optimized image URL with Next.js Image optimization
 */
export function getOptimizedImageUrl(
  src: string,
  options: ImageOptimizationOptions = {}
): string {
  const {
    width = 800,
    height,
    quality = 75,
    format = 'webp',
    placeholder = 'blur',
    blurDataURL
  } = options

  // For external images, use Next.js Image optimization
  if (src.startsWith('http')) {
    const params = new URLSearchParams({
      url: src,
      w: width.toString(),
      q: quality.toString(),
      f: format,
    })

    if (height) {
      params.set('h', height.toString())
    }

    return `/_next/image?${params.toString()}`
  }

  // For local images, return as-is
  return src
}

/**
 * Generate responsive image sizes for different breakpoints
 */
export function getResponsiveImageSizes(breakpoints: number[] = [640, 768, 1024, 1280, 1536]): string {
  return breakpoints
    .map((width, index) => {
      const nextWidth = breakpoints[index + 1]
      if (nextWidth) {
        return `(max-width: ${nextWidth - 1}px) ${width}px`
      }
      return `${width}px`
    })
    .join(', ')
}

/**
 * Generate blur placeholder for images
 */
export function generateBlurDataURL(width: number = 10, height: number = 10): string {
  const canvas = typeof window !== 'undefined' ? document.createElement('canvas') : null
  if (!canvas) return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
  
  canvas.width = width
  canvas.height = height
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
  
  // Create a simple gradient blur
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#f3f4f6')
  gradient.addColorStop(1, '#e5e7eb')
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  return canvas.toDataURL('image/jpeg', 0.1)
}

/**
 * Common image sizes for different use cases
 */
export const IMAGE_SIZES = {
  // Avatar sizes
  avatar: { width: 40, height: 40 },
  avatarLarge: { width: 80, height: 80 },
  
  // Thumbnail sizes
  thumbnail: { width: 150, height: 150 },
  thumbnailLarge: { width: 300, height: 300 },
  
  // Card sizes
  card: { width: 400, height: 250 },
  cardLarge: { width: 600, height: 400 },
  
  // Hero sizes
  hero: { width: 1200, height: 600 },
  heroLarge: { width: 1920, height: 1080 },
  
  // News article sizes
  newsFeatured: { width: 800, height: 400 },
  newsCard: { width: 300, height: 200 },
  newsThumbnail: { width: 150, height: 100 },
} as const

/**
 * Get optimized image props for Next.js Image component
 */
export function getImageProps(
  src: string,
  alt: string,
  options: ImageOptimizationOptions & { className?: string } = {}
) {
  const {
    width = 800,
    height,
    quality = 75,
    format = 'webp',
    placeholder = 'blur',
    blurDataURL,
    className
  } = options

  return {
    src,
    alt,
    width,
    height,
    quality,
    placeholder,
    blurDataURL: blurDataURL || generateBlurDataURL(),
    className,
    sizes: getResponsiveImageSizes(),
  }
}

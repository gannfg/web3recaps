/**
 * Image resizing and compression utilities
 * Automatically resizes and compresses images before upload to reduce file size
 */

export interface ImageResizeOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  maxSizeBytes?: number
}

const DEFAULT_OPTIONS: Required<ImageResizeOptions> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
}

/**
 * Resizes and compresses an image file to reduce file size
 * @param file - The original image file
 * @param options - Resize and compression options
 * @returns Promise<File> - The resized and compressed file
 */
export async function resizeImage(
  file: File, 
  options: ImageResizeOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img
        
        if (width > opts.maxWidth || height > opts.maxHeight) {
          const aspectRatio = width / height
          
          if (width > height) {
            width = Math.min(width, opts.maxWidth)
            height = width / aspectRatio
          } else {
            height = Math.min(height, opts.maxHeight)
            width = height * aspectRatio
          }
        }
        
        // Set canvas dimensions
        canvas.width = width
        canvas.height = height
        
        // Draw and resize the image
        ctx?.drawImage(img, 0, 0, width, height)
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'))
              return
            }
            
            // If still too large, reduce quality further
            if (blob.size > opts.maxSizeBytes) {
              const newQuality = Math.max(0.1, opts.quality * (opts.maxSizeBytes / blob.size))
              canvas.toBlob(
                (compressedBlob) => {
                  if (!compressedBlob) {
                    reject(new Error('Failed to compress image'))
                    return
                  }
                  
                  const compressedFile = new File([compressedBlob], file.name, {
                    type: file.type,
                    lastModified: Date.now(),
                  })
                  
                  console.log(`Image resized: ${file.size} -> ${compressedFile.size} bytes (${Math.round((1 - compressedFile.size / file.size) * 100)}% reduction)`)
                  resolve(compressedFile)
                },
                file.type,
                newQuality
              )
            } else {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              })
              
              console.log(`Image resized: ${file.size} -> ${resizedFile.size} bytes (${Math.round((1 - resizedFile.size / file.size) * 100)}% reduction)`)
              resolve(resizedFile)
            }
          },
          file.type,
          opts.quality
        )
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }
    
    // Load the image
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Resizes an image specifically for event banners (wider aspect ratio)
 */
export async function resizeEventBanner(file: File): Promise<File> {
  return resizeImage(file, {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85,
    maxSizeBytes: 8 * 1024 * 1024, // 8MB for banners
  })
}

/**
 * Resizes an image specifically for event logos (square aspect ratio)
 */
export async function resizeEventLogo(file: File): Promise<File> {
  return resizeImage(file, {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.9,
    maxSizeBytes: 2 * 1024 * 1024, // 2MB for logos
  })
}

/**
 * Resizes an image specifically for event cover images
 */
export async function resizeEventCover(file: File): Promise<File> {
  return resizeImage(file, {
    maxWidth: 1200,
    maxHeight: 800,
    quality: 0.85,
    maxSizeBytes: 6 * 1024 * 1024, // 6MB for covers
  })
}

/**
 * Gets the appropriate resize function based on image type
 */
export function getResizeFunction(type: 'banner' | 'logo' | 'cover') {
  switch (type) {
    case 'banner':
      return resizeEventBanner
    case 'logo':
      return resizeEventLogo
    case 'cover':
      return resizeEventCover
    default:
      return resizeImage
  }
}

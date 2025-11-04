"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageViewerProps {
  images: string[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onNavigate: (index: number) => void
}

export function ImageViewer({ images, currentIndex, isOpen, onClose, onNavigate }: ImageViewerProps) {
  const [isLoading, setIsLoading] = useState(true)

  const currentImage = images[currentIndex]
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < images.length - 1

  const handlePrevious = () => {
    if (hasPrevious) {
      onNavigate(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (hasNext) {
      onNavigate(currentIndex + 1)
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = currentImage
    link.download = `image-${currentIndex + 1}.jpg`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleOpenInNewTab = () => {
    window.open(currentImage, '_blank')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && hasPrevious) {
      handlePrevious()
    } else if (e.key === 'ArrowRight' && hasNext) {
      handleNext()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] p-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Image {currentIndex + 1} of {images.length}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenInNewTab}
                className="h-8 w-8 p-0"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex-1 min-h-0">
          {/* Navigation Arrows */}
          {hasPrevious && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 p-0 bg-black/50 hover:bg-black/70 text-white"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {hasNext && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 p-0 bg-black/50 hover:bg-black/70 text-white"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Image Container */}
          <div className="relative w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            )}
            
            <img
              src={currentImage}
              alt={`Image ${currentIndex + 1}`}
              className={cn(
                "max-w-full max-h-full object-contain transition-opacity duration-200",
                isLoading ? "opacity-0" : "opacity-100"
              )}
              crossOrigin="anonymous"
              onLoad={() => {
                console.log('ImageViewer image loaded:', currentImage)
                setIsLoading(false)
              }}
              onError={(e) => {
                console.error('ImageViewer image failed to load:', currentImage)
                console.error('Image error details:', e)
                setIsLoading(false)
                // Show error message instead of broken image
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <div className="flex gap-2 bg-black/50 backdrop-blur-sm rounded-lg p-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => onNavigate(index)}
                    className={cn(
                      "w-12 h-12 rounded overflow-hidden border-2 transition-all",
                      index === currentIndex
                        ? "border-blue-500 ring-2 ring-blue-500/50"
                        : "border-transparent hover:border-white/50"
                    )}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

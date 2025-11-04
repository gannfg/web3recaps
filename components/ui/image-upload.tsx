"use client"

import { useState, useRef, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { 
  Upload, X, Image as ImageIcon, Video, FileImage, 
  Loader2, AlertCircle, Check
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  bucket: 'team-avatars' | 'team-banners' | 'project-banners' | 'project-logos' | 'project-screenshots' | 'project-videos' | 'avatars'
  entityId: string
  entityType: 'team' | 'project' | 'user'
  currentUrl?: string
  onUpload: (url: string) => void
  onRemove?: () => void
  className?: string
  accept?: string
  maxSize?: number
  multiple?: boolean
  aspectRatio?: 'square' | 'video' | 'banner' | 'auto'
  placeholder?: string
}

const BUCKET_LABELS = {
  'team-avatars': 'Team Avatar',
  'team-banners': 'Team Banner',
  'project-banners': 'Project Banner',
  'project-logos': 'Project Logo',
  'project-screenshots': 'Screenshots',
  'project-videos': 'Videos',
  'avatars': 'Profile Picture'
}

const ASPECT_RATIO_CLASSES = {
  square: 'aspect-square',
  video: 'aspect-video',
  banner: 'aspect-[3/1]',
  auto: ''
}

export function ImageUpload({
  bucket,
  entityId,
  entityType,
  currentUrl,
  onUpload,
  onRemove,
  className,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  aspectRatio = 'auto',
  placeholder
}: ImageUploadProps) {
  const { execute } = useApi()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)

  const isVideo = bucket === 'project-videos'
  const label = BUCKET_LABELS[bucket]

  const handleUpload = useCallback(async (files: FileList) => {
    if (!files.length) return

    const file = files[0] // For now, handle single file
    
    // Validate file size
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`,
        variant: "destructive"
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', bucket)
      formData.append('entityId', entityId)
      formData.append('entityType', entityType)

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await execute('/api/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (result.success && result.data) {
        onUpload(result.data.publicUrl)
        toast({
          title: "Upload successful",
          description: `${label} uploaded successfully`
        })
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [bucket, entityId, entityType, maxSize, onUpload, execute, toast, label])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files)
    }
  }, [handleUpload])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files)
    }
  }, [handleUpload])

  const handleRemove = useCallback(async () => {
    if (!onRemove || !currentUrl) return

    try {
      // Extract filename from URL
      const url = new URL(currentUrl)
      const fileName = url.pathname.split('/').slice(-2).join('/') // Get folder/filename
      
      const result = await execute(`/api/upload?bucket=${bucket}&fileName=${fileName}&entityId=${entityId}&entityType=${entityType}`, {
        method: 'DELETE'
      })

      if (result.success) {
        onRemove()
        toast({
          title: "Removed",
          description: `${label} removed successfully`
        })
      } else {
        throw new Error(result.error || 'Remove failed')
      }
    } catch (error) {
      console.error('Remove error:', error)
      toast({
        title: "Remove failed",
        description: error instanceof Error ? error.message : "Failed to remove file",
        variant: "destructive"
      })
    }
  }, [bucket, entityId, entityType, currentUrl, onRemove, execute, toast, label])

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept || (isVideo ? "video/*" : "image/*")}
        onChange={handleFileInput}
        className="hidden"
        multiple={multiple}
      />

      {currentUrl ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className={cn("relative group", ASPECT_RATIO_CLASSES[aspectRatio])}>
              {isVideo ? (
                <video
                  src={currentUrl}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                <Image
                  src={currentUrl}
                  alt={label}
                  fill
                  className="object-cover"
                />
              )}
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openFileDialog}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Replace
                </Button>
                {onRemove && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemove}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card 
          className={cn(
            "border-2 border-dashed transition-colors cursor-pointer",
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            isUploading && "pointer-events-none opacity-50",
            ASPECT_RATIO_CLASSES[aspectRatio]
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
            {isUploading ? (
              <div className="space-y-3 w-full max-w-xs">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Uploading...</p>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
                </div>
              </div>
            ) : (
              <>
                {isVideo ? (
                  <Video className="h-12 w-12 text-muted-foreground mb-4" />
                ) : (
                  <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                )}
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {placeholder || `Upload ${label}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Drag and drop or click to select
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    Max {Math.round(maxSize / (1024 * 1024))}MB
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Multiple files preview (for screenshots/videos) */}
      {multiple && currentUrl && (
        <div className="text-xs text-muted-foreground">
          <p>💡 Tip: You can upload multiple files for screenshots and videos</p>
        </div>
      )}
    </div>
  )
}

// Multiple file upload variant
interface MultipleImageUploadProps extends Omit<ImageUploadProps, 'currentUrl' | 'onUpload' | 'onRemove' | 'multiple'> {
  currentUrls: string[]
  onUpload: (urls: string[]) => void
  onRemove: (index: number) => void
  maxFiles?: number
}

export function MultipleImageUpload({
  currentUrls,
  onUpload,
  onRemove,
  maxFiles = 10,
  ...props
}: MultipleImageUploadProps) {
  const handleSingleUpload = (url: string) => {
    const newUrls = [...currentUrls, url]
    onUpload(newUrls)
  }

  const handleSingleRemove = (index: number) => {
    onRemove(index)
  }

  return (
    <div className="space-y-4">
      {/* Existing files */}
      {currentUrls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {currentUrls.map((url, index) => (
            <Card key={index} className="overflow-hidden group">
              <CardContent className="p-0">
                <div className="relative aspect-video">
                  {props.bucket === 'project-videos' ? (
                    <video
                      src={url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : (
                    <Image
                      src={url}
                      alt={`Upload ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  )}
                  <div className="absolute top-2 right-2">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleSingleRemove(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload new file */}
      {currentUrls.length < maxFiles && (
        <ImageUpload
          {...props}
          onUpload={handleSingleUpload}
          placeholder={`Add ${props.bucket === 'project-videos' ? 'video' : 'image'} (${currentUrls.length}/${maxFiles})`}
        />
      )}

      {currentUrls.length >= maxFiles && (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center">
            <Check className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Maximum of {maxFiles} files reached
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

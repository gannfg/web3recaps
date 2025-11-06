"use client"

import { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
// Removed unused imports
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { ImageViewer } from "./image-viewer"
import { 
  X, 
  Send, 
  Image as ImageIcon,
  Video,
  Smile
} from "lucide-react"
import type { Post } from "@/lib/types"

const postSchema = z.object({
  content: z.string().min(1, "Content is required"),
})

type PostData = z.infer<typeof postSchema>

// Removed POST_TYPES - using simple post format like X

interface EnhancedPostComposerProps {
  onPostCreated?: (post: Post) => void
  placeholder?: string
}

export function EnhancedPostComposer({ onPostCreated, placeholder = "What's happening in the Solana ecosystem?" }: EnhancedPostComposerProps) {
  const { user } = useSession()
  const { execute } = useApi()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)

  const form = useForm<PostData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      content: "",
    },
  })

  const onSubmit = async (data: PostData) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to create a post.",
        variant: "destructive",
      })
      return
    }

    try {
      console.log('Submitting post with data:', {
        content: data.content,
        images: selectedImages,
        videos: selectedVideos
      })

      // Create optimistic post for immediate UI feedback
      const optimisticPost: Post = {
        id: `temp-${Date.now()}`, // Temporary ID
        shortId: Date.now(),
        authorId: user.id,
        content: data.content,
        postType: "general",
        tags: [],
        images: selectedImages,
        videos: selectedVideos,
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Immediately add to feed for instant feedback
      onPostCreated?.(optimisticPost)
      
      // Reset form immediately since post appears instantly
      form.reset()
      setSelectedImages([])
      setSelectedVideos([])
      setIsExpanded(false)

      const result = await execute("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          ...data,
          postType: "general",
          images: selectedImages,
          videos: selectedVideos,
          tags: [],
          githubUrl: "",
          figmaUrl: "",
          websiteUrl: "",
        }),
      })

      console.log('Post submission result:', result)

      if (result.success && result.data) {
        // Replace optimistic post with real post data
        onPostCreated?.(result.data)
      } else {
        throw new Error(result.error || "Failed to create post")
      }
    } catch (error) {
      console.error('Post submission error:', error)
      toast({
        title: "Failed to create post",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      })
      
      // TODO: Remove optimistic post on error
    }
  }

  const handleImageUpload = async (files: FileList) => {
    if (!files || files.length === 0) return
    
    setIsUploading(true)
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        console.log('Uploading image:', file.name, file.size, file.type)
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bucket', 'post-images')
        
        const result = await execute('/api/upload', {
          method: 'POST',
          body: formData,
        })
        
        console.log('Upload result:', result)
        
        if (result.success && result.data?.publicUrl) {
          console.log('Upload successful, URL:', result.data.publicUrl)
          return result.data.publicUrl
        }
        
        const errorMsg = result.error || result.data?.error || 'Upload failed'
        console.error('Upload failed:', errorMsg, result)
        throw new Error(errorMsg)
      })

      const urls = await Promise.all(uploadPromises)
      console.log('All uploads successful, URLs:', urls)
      setSelectedImages(prev => [...prev, ...urls])
      
      toast({
        title: "Images uploaded successfully!",
        description: `${urls.length} image(s) ready to post.`,
      })
    } catch (error) {
      console.error('Image upload error:', error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload images. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleVideoUpload = async (files: FileList) => {
    if (!files || files.length === 0) return
    
    setIsUploading(true)
    try {
      // For now, we'll handle video uploads the same as images
      // In production, you might want to use a video-specific service
      const uploadPromises = Array.from(files).map(async (file) => {
        console.log('Uploading video:', file.name, file.size, file.type)
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bucket', 'post-videos')
        
        const result = await execute('/api/upload', {
          method: 'POST',
          body: formData,
        })
        
        console.log('Upload result:', result)
        
        if (result.success && result.data?.publicUrl) {
          console.log('Upload successful, URL:', result.data.publicUrl)
          return result.data.publicUrl
        }
        
        const errorMsg = result.error || result.data?.error || 'Upload failed'
        console.error('Upload failed:', errorMsg, result)
        throw new Error(errorMsg)
      })

      const urls = await Promise.all(uploadPromises)
      console.log('All uploads successful, URLs:', urls)
      setSelectedVideos(prev => [...prev, ...urls])
      
      toast({
        title: "Videos uploaded successfully!",
        description: `${urls.length} video(s) ready to post.`,
      })
    } catch (error) {
      console.error('Video upload error:', error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload videos. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const removeVideo = (index: number) => {
    setSelectedVideos(prev => prev.filter((_, i) => i !== index))
  }

  const openImageViewer = (index: number) => {
    setViewerIndex(index)
    setViewerOpen(true)
  }

  const closeImageViewer = () => {
    setViewerOpen(false)
  }

  const navigateImageViewer = (index: number) => {
    setViewerIndex(index)
  }

  // Removed tag and link functions - using simple X-style posts

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please log in to create posts</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
         <Form {...form}>
           <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             {/* Avatar above text box for better width utilization */}
             <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatarUrl || "/placeholder.svg"} />
                <AvatarFallback>{user.displayName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="text-sm font-medium text-foreground">
                {user.displayName || "User"}
              </div>
             </div>
              
             <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                         <div className="relative">
                           <Textarea
                             placeholder={placeholder}
                             className="w-full min-h-[120px] resize-none border border-gray-200 rounded-lg p-4 text-base focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500"
                             {...field}
                             onFocus={() => setIsExpanded(true)}
                             disabled={isUploading}
                           />
                          {isUploading && (
                            <div className="absolute top-2 right-2 flex items-center gap-2 text-sm text-muted-foreground">
                               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                              Uploading...
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Media Preview - Videos above, Images below */}
                {(selectedImages.length > 0 || selectedVideos.length > 0) && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">
                      Media ({selectedImages.length + selectedVideos.length})
                    </div>
                    
                    <div className="space-y-3">
                      {/* Videos Section - Always on top */}
                      {selectedVideos.length > 0 && (
                        <div className="space-y-2">
                          {selectedVideos.map((url, index) => (
                            <div key={`vid-${index}`} className="relative group">
                              <video
                                src={url}
                                className="w-full h-32 object-cover rounded-lg border shadow-sm"
                                controls
                                preload="metadata"
                                onError={(e) => {
                                  console.error('Video failed to load:', url)
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeVideo(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Images Section - Below videos, smaller if multiple */}
                      {selectedImages.length > 0 && (
                        <div className="space-y-2">
                          {selectedImages.length === 1 ? (
                            // Single image - full width
                            <div className="relative group">
                              <img
                                src={selectedImages[0]}
                                alt="Upload preview"
                                className="w-full h-32 object-cover rounded-lg border shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                crossOrigin="anonymous"
                                onLoad={() => console.log('Preview image loaded:', selectedImages[0])}
                                onError={(e) => {
                                  console.error('Image failed to load:', selectedImages[0])
                                  e.currentTarget.src = '/placeholder.jpg'
                                }}
                                onClick={() => openImageViewer(0)}
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeImage(0)
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            // Multiple images - grid layout
                            <div className={`grid gap-2 ${selectedImages.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                              {selectedImages.map((url, index) => (
                                <div key={`img-${index}`} className="relative group">
                                  <img
                                    src={url}
                                    alt={`Upload ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg border shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                    crossOrigin="anonymous"
                                    onLoad={() => console.log('Preview image loaded:', url)}
                                    onError={(e) => {
                                      console.error('Image failed to load:', url)
                                      e.currentTarget.src = '/placeholder.jpg'
                                    }}
                                    onClick={() => openImageViewer(index)}
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeImage(index)
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Hidden file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files
                    if (files && files.length > 0) {
                      console.log('Image files selected:', files.length)
                      handleImageUpload(files)
                    }
                    // Reset input so same file can be selected again
                    e.target.value = ''
                  }}
                />
                
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files
                    if (files && files.length > 0) {
                      console.log('Video files selected:', files.length)
                      handleVideoUpload(files)
                    }
                    // Reset input so same file can be selected again
                    e.target.value = ''
                  }}
                />

                {/* Removed expanded options - using simple X-style posts */}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                       className="hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                      title="Add images"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={isUploading}
                       className="hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                      title="Add videos"
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    {(selectedImages.length > 0 || selectedVideos.length > 0 || form.watch('content').trim()) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsExpanded(false)
                          form.reset()
                          setSelectedImages([])
                          setSelectedVideos([])
                        }}
                        disabled={isUploading}
                      >
                        Clear
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={!form.watch('content').trim() || isUploading}
                       className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-black"
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Post
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>

        {/* Image Viewer */}
        <ImageViewer
          images={selectedImages}
          currentIndex={viewerIndex}
          isOpen={viewerOpen}
          onClose={closeImageViewer}
          onNavigate={navigateImageViewer}
        />
      </Card>
    )
  }

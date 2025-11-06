"use client"

import { useState, useEffect, useRef, memo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ImageViewer } from "@/components/feed/image-viewer"
import { CommentModal } from "./comment-modal"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { formatRelativeTime } from "@/lib/utils"
import { Heart, MessageCircle, MoreHorizontal, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Post, User } from "@/lib/types"

interface PostCardProps {
  post: Post
  author: User
  onLike?: (postId: string) => void
  onComment?: (postId: string) => void
  onDelete?: (postId: string) => void
}

// Removed post type styling - using simple X-style layout

export const PostCard = memo(function PostCard({ post, author, onLike, onComment, onDelete }: PostCardProps) {
  const { user } = useSession()
  const { execute } = useApi()
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likesCount)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [checkingLikeStatus, setCheckingLikeStatus] = useState(true)
  const hasCheckedLikeStatus = useRef(false)
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [commentsCount, setCommentsCount] = useState(post.commentsCount)

  // Check if user has already liked this post
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user || hasCheckedLikeStatus.current) {
        setCheckingLikeStatus(false)
        return
      }

      hasCheckedLikeStatus.current = true

      try {
        const result = await execute(`/api/posts/${post.id}/like-status`, {
          method: 'GET',
          headers: {
            'x-user-id': user.id,
          }
        })

        if (result.success) {
          setIsLiked(result.data?.liked || false)
          
          // Sync the like count with actual likes
          const actualLikeCount = result.data?.actualLikeCount || 0
          if (actualLikeCount !== likesCount) {
            setLikesCount(actualLikeCount)
          }
        }
      } catch (error) {
        console.error('Error checking like status:', error)
      } finally {
        setCheckingLikeStatus(false)
      }
    }

    checkLikeStatus()
  }, [user?.id, post.id]) // Removed execute from dependencies to prevent loop

  // Sync comment count on component mount
  useEffect(() => {
    const syncCommentCount = async () => {
      try {
        const result = await execute(`/api/posts/${post.id}/comments`, {
          method: 'GET',
        })

        if (result.success) {
          const actualCommentCount = result.data?.length || 0
          if (actualCommentCount !== commentsCount) {
            setCommentsCount(actualCommentCount)
          }
        }
      } catch (error) {
        console.error('Error syncing comment count:', error)
      }
    }

    syncCommentCount()
  }, [post.id, commentsCount]) // Include commentsCount to prevent infinite loop

  if (!author) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="py-6">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-24 animate-pulse" />
              <div className="h-3 bg-muted rounded w-16 animate-pulse" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleLike = async () => {
    if (!user) {
      console.warn('User not logged in, cannot like post')
      alert('Please log in to like posts')
      return
    }

    const previousLikedState = isLiked
    const previousLikesCount = likesCount

    try {
      // Toggle like state optimistically
      const newLikedState = !isLiked
      const newLikesCount = newLikedState ? likesCount + 1 : likesCount - 1
      
      setIsLiked(newLikedState)
      setLikesCount(newLikesCount)

      // Call API to like/unlike the post
      const result = await execute(`/api/posts/${post.id}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          liked: newLikedState
        })
      })

      if (!result.success) {
        // Revert on error
        setIsLiked(previousLikedState)
        setLikesCount(previousLikesCount)
        console.error('Failed to like post:', result.error)
        // Show error to user
        alert(`Failed to like post: ${result.error || 'Unknown error'}`)
      } else {
        // Update with server response if available
        if (result.data?.likesCount !== undefined) {
          setLikesCount(result.data.likesCount)
        }
        onLike?.(post.id)
      }
    } catch (error) {
      // Revert on error
      setIsLiked(previousLikedState)
      setLikesCount(previousLikesCount)
      console.error('Like error:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to like post'}`)
    }
  }

  const handleComment = async () => {
    if (!user) {
      alert('Please log in to comment on posts')
      return
    }
    
    setCommentModalOpen(true)
    
    // Load comments when modal opens
    try {
      const result = await execute(`/api/posts/${post.id}/comments`, {
        method: 'GET',
      })

      if (result.success) {
        setComments(result.data || [])
        
        // Sync the comment count with actual comments
        const actualCommentCount = result.data?.length || 0
        if (actualCommentCount !== commentsCount) {
          setCommentsCount(actualCommentCount)
        }
      } else {
        console.error('Failed to load comments:', result.error)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    }
    
    onComment?.(post.id)
  }

  const handleCommentAdded = (newComment: any) => {
    // The newComment already has the correct author data from the API response
    setComments(prev => [...prev, newComment])
    
    // Update the comment count with the value from the API
    if (newComment.updatedCommentsCount !== undefined) {
      setCommentsCount(newComment.updatedCommentsCount)
    } else {
      setCommentsCount(prev => prev + 1)
    }
  }

  const handleDelete = async () => {
    if (!user || user.id !== post.authorId) return

    try {
      const result = await execute(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id,
        }
      })

      if (result.success) {
        onDelete?.(post.id)
      } else {
        console.error('Failed to delete post:', result.error)
      }
    } catch (error) {
      console.error('Delete error:', error)
    }
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={author?.avatarUrl || "/placeholder.svg"} />
              <AvatarFallback>{author?.displayName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{author?.displayName || "Anonymous"}</p>
                <Badge variant="outline" className="text-xs">
                  {author?.rank || "Newcomer"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>@{author?.displayName?.toLowerCase().replace(/\s+/g, '') || 'anonymous'}</span>
                <span>•</span>
                <span>{formatRelativeTime(post.createdAt)}</span>
              </div>
            </div>
          </div>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user?.id === author?.id && (
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-red-500 focus:text-red-500"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="text-pretty whitespace-pre-wrap text-base leading-relaxed">{post.content}</p>
        </div>

        {/* Media Container - Videos above, Images below */}
        {(post.videos && post.videos.length > 0) || (post.images && post.images.length > 0) ? (
          <div className="mt-3 space-y-3">
            {/* Videos Section - Always on top */}
            {post.videos && post.videos.length > 0 && (
              <div className="space-y-3">
                {post.videos.map((video, index) => (
                  <div key={`vid-${index}`} className="relative">
                    <video
                      src={video}
                      controls
                      className="w-full h-auto max-h-96 object-cover rounded-lg border shadow-sm"
                      preload="metadata"
                      onError={(e) => {
                        console.error('Failed to load video:', video)
                        e.currentTarget.style.display = 'none'
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ))}
              </div>
            )}

            {/* Images Section - Below videos, smaller if multiple */}
            {post.images && post.images.length > 0 && (
              <div className="space-y-2">
                {post.images.length === 1 ? (
                  // Single image - full width
                  <div className="relative group">
                    <img
                      src={post.images[0]}
                      alt="Post image"
                      className="w-full h-auto max-h-96 object-cover rounded-lg border shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
                      loading="lazy"
                      crossOrigin="anonymous"
                      onLoad={() => console.log('Image loaded successfully:', post.images?.[0])}
                      onError={(e) => {
                        console.error('Failed to load image:', post.images?.[0])
                        console.error('Image error details:', e)
                        // Show a placeholder instead of hiding
                        e.currentTarget.src = '/placeholder.jpg'
                        e.currentTarget.alt = 'Image failed to load'
                      }}
                      onClick={() => openImageViewer(0)}
                    />
                  </div>
                ) : (
                  // Multiple images - grid layout
                  <div className={`grid gap-2 ${post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                    {post.images.map((image, index) => (
                      <div key={`img-${index}`} className="relative group">
                        <img
                          src={image}
                          alt={`Post image ${index + 1}`}
                          className="w-full h-32 sm:h-40 object-cover rounded-lg border shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
                          loading="lazy"
                          crossOrigin="anonymous"
                          onLoad={() => console.log('Image loaded successfully:', image)}
                          onError={(e) => {
                            console.error('Failed to load image:', image)
                            console.error('Image error details:', e)
                            // Show a placeholder instead of hiding
                            e.currentTarget.src = '/placeholder.jpg'
                            e.currentTarget.alt = 'Image failed to load'
                          }}
                          onClick={() => openImageViewer(index)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Removed links and tags display - using simple X-style posts */}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4">
            {/* Like Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={checkingLikeStatus}
              className={`flex items-center gap-1 ${
                isLiked 
                  ? 'text-blue-600 hover:text-blue-700' 
                  : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              {likesCount > 0 && (
                <span className="text-xs">{likesCount}</span>
              )}
            </Button>

            {/* Comment Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComment}
              className="flex items-center gap-1 text-gray-500 hover:text-blue-600"
            >
              <MessageCircle className="h-4 w-4" />
              {commentsCount > 0 && (
                <span className="text-xs">{commentsCount}</span>
              )}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Image Viewer */}
      {post.images && post.images.length > 0 && (
        <ImageViewer
          images={post.images}
          currentIndex={viewerIndex}
          isOpen={viewerOpen}
          onClose={closeImageViewer}
          onNavigate={navigateImageViewer}
        />
      )}

      {/* Comment Modal */}
      <CommentModal
        postId={post.id}
        postAuthor={author.displayName || "Unknown"}
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        comments={comments}
        onCommentAdded={handleCommentAdded}
      />
    </Card>
  )
})

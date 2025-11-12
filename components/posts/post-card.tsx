"use client"

import { useState, useEffect, useRef, memo, type ElementType } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ImageViewer } from "@/components/feed/image-viewer"
import { CommentModal } from "./comment-modal"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { formatRelativeTime, resolveStorageUrl } from "@/lib/utils"
import { Heart, MessageCircle, MoreHorizontal, Trash2, LogIn, AlertCircle, Share2, Copy, UserRound, Globe, Twitter, Linkedin, Github, Mail, ExternalLink } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Post, User } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  const { toast } = useToast()
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likesCount)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [checkingLikeStatus, setCheckingLikeStatus] = useState(true)
  const hasCheckedLikeStatus = useRef(false)
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [commentsCount, setCommentsCount] = useState(post.commentsCount)
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

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
      setLoginDialogOpen(true)
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
        setErrorMessage(result.error || 'Unknown error occurred')
        setErrorDialogOpen(true)
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
      setErrorMessage(error instanceof Error ? error.message : 'Failed to like post')
      setErrorDialogOpen(true)
    }
  }

  const handleComment = async () => {
    if (!user) {
      setLoginDialogOpen(true)
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

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    const envBase = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://web3recap.io'
    return envBase.replace(/\/$/, '')
  }

  const getPostUrl = () => `${getBaseUrl()}/feed?post=${post.shortId}`

  const getPrimaryProfileLink = () => {
    const links = author?.socialLinks || {}
    return (
      links.website ||
      links.twitter ||
      links.linkedin ||
      links.github ||
      links.discord ||
      links.email ||
      ""
    )
  }

  const handleCopyLink = async () => {
    const url = getPostUrl()

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        toast({
          title: "Link copied",
          description: "Post link copied to clipboard.",
        })
      } else {
        throw new Error("Clipboard API unavailable")
      }
    } catch (error) {
      console.error("Failed to copy link:", error)
      setErrorMessage(`Unable to copy link automatically. You can copy it manually:\n${url}`)
      setErrorDialogOpen(true)
    }
  }

  const handleSharePost = async () => {
    const url = getPostUrl()
    const shareData = {
      title: author?.displayName ? `${author.displayName} on Web3Recap` : 'Web3Recap Feed',
      text: post.content?.slice(0, 120),
      url,
    }

    if (navigator?.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return
        }
        console.warn('Native share failed, falling back to copy.', error)
      }
    }

    await handleCopyLink()
  }

  const handleShareProfile = async () => {
    const url = getPrimaryProfileLink() || ""

    if (!url) {
      toast({
        title: "Profile unavailable",
        description: "This author has not shared a public profile yet.",
      })
      return
    }

    const shareUrl = url.startsWith('http') || url.startsWith('mailto:')
      ? url
      : url.includes('@') && url.includes('.') && !url.includes('http')
      ? `mailto:${url}`
      : `https://${url}`

    const shareData = {
      title: author?.displayName ? `${author.displayName} • Web3Recap Profile` : 'Web3Recap Profile',
      text: author?.bio?.slice(0, 120) || 'Check out this profile on Web3Recap.',
      url: shareUrl,
    }

    if (navigator?.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return
        }
        console.warn('Native share failed, falling back to copy.', error)
      }
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        toast({
          title: "Link copied",
          description: "Profile link copied to clipboard.",
        })
      }
    } catch (error) {
      console.error("Failed to copy profile link:", error)
    }
  }

  const handleOpenLink = (rawValue: string) => {
    if (typeof window === 'undefined') return

    if (!rawValue) return
    let value = rawValue.trim()
    if (value.startsWith('mailto:')) {
      window.open(value, '_blank', 'noopener,noreferrer')
      return
    }

    if (value.includes('@') && !value.includes('http') && value.includes('.')) {
      value = `mailto:${value}`
      window.open(value, '_blank', 'noopener,noreferrer')
      return
    }

    const finalUrl = value.startsWith('http') ? value : `https://${value}`
    window.open(finalUrl, '_blank', 'noopener,noreferrer')
  }

  const renderSocialButtons = (links: Record<string, string>) => {
    const entries: Array<{ key: string; label: string; value: string; icon: ElementType }> = [
      { key: 'website', label: 'Website', value: links.website, icon: Globe },
      { key: 'twitter', label: 'Twitter', value: links.twitter, icon: Twitter },
      { key: 'linkedin', label: 'LinkedIn', value: links.linkedin, icon: Linkedin },
      { key: 'github', label: 'GitHub', value: links.github, icon: Github },
      { key: 'discord', label: 'Discord', value: links.discord, icon: ExternalLink },
      { key: 'email', label: 'Email', value: links.email, icon: Mail },
    ]

    return entries
      .filter((item) => Boolean(item.value))
      .map(({ key, label, value, icon: Icon }) => (
        <Button
          key={key}
          type="button"
          variant="outline"
          className="justify-between"
          onClick={() => handleOpenLink(String(value))}
        >
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {label}
          </span>
          <ExternalLink className="h-4 w-4 opacity-60" />
        </Button>
      ))
  }

  const handleViewProfile = () => {
    setProfileDialogOpen(true)
  }

  const avatarSrc = resolveStorageUrl(author?.avatarUrl)
  const bannerSrc = resolveStorageUrl(author?.bannerUrl)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setProfileDialogOpen(true)}
              className="rounded-full focus:outline-none focus-visible:ring focus-visible:ring-primary/50 transition-shadow"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={avatarSrc || "/placeholder.svg"} />
                <AvatarFallback>{author?.displayName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProfileDialogOpen(true)}
                  className="font-medium text-left leading-tight hover:text-primary focus-visible:outline-none focus-visible:ring focus-visible:ring-primary/50 transition-colors"
                >
                  {author?.displayName || "Anonymous"}
                </button>
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
              <DropdownMenuItem onClick={handleViewProfile}>
                <UserRound className="h-4 w-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSharePost}>
                <Share2 className="h-4 w-4 mr-2" />
                Share Post
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              {user?.id === author?.id && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-red-500 focus:text-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Post
                  </DropdownMenuItem>
                </>
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

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-lg overflow-hidden">
          <div className="relative -mx-6 -mt-6 h-32">
            {bannerSrc ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${bannerSrc})` }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 dark:from-primary/30 dark:via-primary/20 dark:to-primary/30" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
          </div>

          <DialogHeader className="text-left space-y-3 -mt-12">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                <AvatarImage src={avatarSrc || "/placeholder.svg"} />
                <AvatarFallback>{author?.displayName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1 pt-6">
                <DialogTitle className="text-2xl font-semibold leading-snug truncate">
                  {author?.displayName || "Anonymous"}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  @{author?.displayName?.toLowerCase().replace(/\s+/g, '') || "anonymous"}
                </DialogDescription>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {author?.rank && (
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 bg-background/60 backdrop-blur">
                      <Badge variant="outline" className="text-xs">{author.rank}</Badge>
                      {typeof author.level === 'number' && author.level > 0 && (
                        <span>• Level {author.level}</span>
                      )}
                    </span>
                  )}
                  {typeof author.totalXp === 'number' && (
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 bg-background/60 backdrop-blur">
                      {Intl.NumberFormat().format(author.totalXp)} XP
                    </span>
                  )}
                </div>
              </div>
            </div>
            {author?.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {author.bio}
              </p>
            )}
          </DialogHeader>

          {author?.skills && author.skills.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/40">
              <p className="text-xs uppercase font-semibold text-muted-foreground mb-2 tracking-wide">
                Skills
              </p>
              <div className="flex flex-wrap gap-2">
                {author.skills.slice(0, 8).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium"
                  >
                    {skill}
                  </span>
                ))}
                {author.skills.length > 8 && (
                  <span className="text-xs text-muted-foreground">
                    +{author.skills.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wide">
              Social Links
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {renderSocialButtons(author?.socialLinks || {})}
            </div>
            {(!author?.socialLinks || Object.values(author.socialLinks || {}).every((v) => !v)) && (
              <p className="text-sm text-muted-foreground">
                No public links shared yet.
              </p>
            )}
          </div>

          <DialogFooter className="sm:justify-end pt-4">
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
              Close
            </Button>
            <Button variant="secondary" onClick={handleShareProfile}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login Required Dialog */}
      <AlertDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="text-left">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 shadow-lg">
                <LogIn className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <AlertDialogTitle className="text-xl font-semibold leading-tight">
                  Sign in required
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
                  Connect your wallet to interact with posts, like, and comment.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-end gap-2 pt-4">
            <AlertDialogAction 
              onClick={() => setLoginDialogOpen(false)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="text-left">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 shadow-lg">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <AlertDialogTitle className="text-xl font-semibold leading-tight">
                  Something went wrong
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
                  {errorMessage || 'An unexpected error occurred. Please try again.'}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-end gap-2 pt-4">
            <AlertDialogAction 
              onClick={() => setErrorDialogOpen(false)}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white shadow-sm"
            >
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
})

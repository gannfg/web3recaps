'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { useSession } from '@/store/useSession'
import { PostCard } from '@/components/posts/post-card'
import { EnhancedPostComposer } from '@/components/feed/enhanced-post-composer'
import { ActivitySidebar } from '@/components/feed/activity-sidebar'
import { EventsSidebar } from '@/components/feed/events-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { ApiResponse, Post, User } from '@/lib/types'

export default function FeedPage() {
  const { execute } = useApi()
  const { user } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [authors, setAuthors] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const previousUserRef = useRef<User | null>(null)

  // Define loadAuthors first so it can be used in useEffects
  const loadAuthors = useCallback(async (authorIds: string[]) => {
    try {
      const results = await Promise.allSettled<ApiResponse<User>>(
        authorIds.map(id => {
          // If this is the current user, use session data instead of fetching
          if (user && id === user.id) {
            return Promise.resolve<ApiResponse<User>>({
              success: true,
              data: user,
            })
          }
          return execute(`/api/users/${id}`) as Promise<ApiResponse<User>>
        })
      )
      
      const newAuthors: Record<string, User> = {}
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value?.success && result.value.data) {
          newAuthors[authorIds[index]] = result.value.data
        }
      })
      
      setAuthors(prev => ({ ...prev, ...newAuthors }))
    } catch (error) {
      console.error('Failed to load authors:', error)
    }
  }, [user, execute])

  const offsetRef = useRef(0)

  const loadPosts = async (loadMore = false) => {
    if (!loadMore) {
      setLoading(true)
      offsetRef.current = 0
      setOffset(0)
    }

    try {
      const currentOffset = loadMore ? offsetRef.current : 0
      const result = await execute(`/api/posts?limit=20&offset=${currentOffset}`)
      
      if (result.success && result.data?.posts) {
        const newPosts: Post[] = result.data.posts as Post[]
        if (loadMore) {
          setPosts(prev => [...prev, ...newPosts])
        } else {
          setPosts(newPosts)
        }
        setHasMore(result.data.hasMore || false)
        const newOffset = loadMore ? offsetRef.current + newPosts.length : newPosts.length
        offsetRef.current = newOffset
        setOffset(newOffset)

        // Load authors for all posts
        const authorIds = [...new Set(newPosts.map(p => p.authorId).filter((id): id is string => Boolean(id)))]
        if (authorIds.length > 0) {
          loadAuthors(authorIds)
        }
      }
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Watch for changes to the current user's profile and refresh author data
  useEffect(() => {
    if (!user) {
      previousUserRef.current = null
      return
    }

    const previousUser = previousUserRef.current
    
    // Check if user profile data has changed (avatar, displayName, etc.)
    if (previousUser && previousUser.id === user.id) {
      const profileChanged = 
        previousUser.avatarUrl !== user.avatarUrl ||
        previousUser.displayName !== user.displayName ||
        previousUser.bio !== user.bio ||
        previousUser.rank !== user.rank

      if (profileChanged) {
        // Refresh author data for the current user's posts
        setAuthors(prev => ({
          ...prev,
          [user.id]: user
        }))
      }
    }

    previousUserRef.current = user
  }, [user])

  // Refresh author data when page becomes visible (to catch changes from other tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && posts.length > 0) {
        // Refresh author data for all posts
        const authorIds = [...new Set(posts.map(p => p.authorId).filter((id): id is string => Boolean(id)))]
        if (authorIds.length > 0) {
          loadAuthors(authorIds)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [posts, loadAuthors])

  const handleLoadMore = () => {
    loadPosts(true)
  }

  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, likesCount: post.likesCount + 1 }
        : post
    ))
  }

  const handleComment = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, commentsCount: post.commentsCount + 1 }
        : post
    ))
  }

  const handleDelete = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId))
  }

  const handlePostCreated = () => {
    loadPosts(false)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Activity Feed */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          <ActivitySidebar />
        </div>

        {/* Middle Column: Join the Conversation + Posts */}
        <div className="lg:col-span-6 order-1 lg:order-2">
          {/* Join the Conversation Section */}
          {!user && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Join the Conversation
                    <ArrowRight className="h-5 w-5" />
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Sign in to share your thoughts and engage with the community
                </p>
                <Link href="/login">
                  <Button className="w-full">
                    Sign In
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Post Composer (for authenticated users) */}
          {user && (
            <div className="mb-6">
              <EnhancedPostComposer 
                onPostCreated={(post) => {
                  // Add the new post to the top of the feed
                  if (post) {
                    setPosts(prev => {
                      // Remove any temporary post with the same ID
                      const filtered = prev.filter(p => p.id !== post.id)
                      return [post, ...filtered]
                    })
                    // Reload to get the full post data from server
                    loadPosts(false)
                  }
                }} 
                placeholder="What's happening in the Solana ecosystem?"
              />
            </div>
          )}

          {/* Posts Feed */}
          <div className="space-y-4">
            {loading && posts.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-muted rounded w-full mb-2"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                  </CardContent>
                </Card>
              ))
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No posts yet. Be the first to share something!
                </CardContent>
              </Card>
            ) : (
              <>
                {posts.map((post) => {
                  const author = authors[post.authorId]
                  if (!author) {
                    return null
                  }
                  return (
                    <PostCard
                      key={post.id}
                      post={post}
                      author={author}
                      onLike={handleLike}
                      onComment={handleComment}
                      onDelete={handleDelete}
                    />
                  )
                })}
                
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Events + Latest News */}
        <div className="lg:col-span-3 order-3">
          <EventsSidebar />
        </div>
      </div>
    </div>
  )
}
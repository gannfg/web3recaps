"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import { PostCard } from "@/components/posts/post-card"

// Lazy load heavy components
const EnhancedPostComposer = dynamic(() => import("@/components/feed/enhanced-post-composer").then(mod => ({ default: mod.EnhancedPostComposer })), {
  loading: () => <div className="p-6 border rounded-lg animate-pulse"><div className="h-32 bg-muted rounded" /></div>,
  ssr: false
});

const ActivitySidebar = dynamic(() => import("@/components/feed/activity-sidebar").then(mod => ({ default: mod.ActivitySidebar })), {
  loading: () => <div className="space-y-4"><div className="h-64 bg-muted rounded animate-pulse" /></div>,
  ssr: false
});

const EventsSidebar = dynamic(() => import("@/components/feed/events-sidebar").then(mod => ({ default: mod.EventsSidebar })), {
  loading: () => <div className="space-y-4"><div className="h-64 bg-muted rounded animate-pulse" /></div>,
  ssr: false
});
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/loading-button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useApi } from "@/hooks/use-api"
import { useFeedCache } from "@/hooks/use-feed-cache"
import { useSession } from "@/store/useSession"
import { Filter, RefreshCw, Activity, MessageSquare, Calendar, LogIn } from "lucide-react"
import Link from "next/link"
// Removed separate LatestArticlesWidget card; sidebar handles latest news
import type { Post, User } from "@/lib/types"

// Removed post type filters - using simple X-style feed

// Simple login prompt component for unauthenticated users
function LoginPrompt() {
  return (
    <div className="bg-card border rounded-lg p-6 text-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="p-3 bg-muted rounded-full">
          <LogIn className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Join the Conversation</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Sign in to share your thoughts and engage with the community
          </p>
        </div>
        <Link href="/login">
          <Button className="w-full">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function FeedPage() {
  const { user } = useSession()
  const { execute } = useApi()
  const {
    getCachedPosts,
    getCachedUser,
    getCachedUsers,
    needsRefresh,
    cachePosts,
    cacheUser,
    updateCachedPost,
    addCachedPost,
    removeCachedPost,
    onRefresh,
    triggerRefresh,
    isRefreshing,
    setIsRefreshing
  } = useFeedCache()
  
  const [posts, setPosts] = useState<Post[]>([])
  const [users, setUsers] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  // Refs for intersection observer
  const observerRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  const loadPosts = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true)
      setPage(0)
      setIsLoadingMore(false)
    } else {
      if (isLoadingMore) return // Prevent duplicate calls
      setLoadingMore(true)
      setIsLoadingMore(true)
    }

    try {
      const currentPage = reset ? 0 : page
      const limit = 5 // Load 5 posts at a time
      const offset = currentPage * limit
      
      // Check cache first
      const cachedPosts = getCachedPosts(currentPage)
      const cachedUsers = getCachedUsers()
      
      if (cachedPosts && !needsRefresh(currentPage)) {
        console.log(`Using cached posts for page ${currentPage}`)
        
        if (reset) {
          setPosts(cachedPosts)
        } else {
          setPosts(prev => [...prev, ...cachedPosts])
        }
        
        setUsers(cachedUsers)
        setPage(currentPage + 1)
        setLoading(false)
        setLoadingMore(false)
        setIsLoadingMore(false)
        return
      }
      
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Loading posts from API - page: ${currentPage}, offset: ${offset}, limit: ${limit}`)
      }
      
      const result = await execute(`/api/posts?limit=${limit}&offset=${offset}`)
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Posts API result:', result)
      }

      if (result.success && result.data) {
        const newPosts = result.data.posts
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log('New posts loaded:', newPosts.length)
        }
        
        // Cache the posts
        cachePosts(currentPage, newPosts)
        
        if (reset) {
          setPosts(newPosts)
        } else {
          setPosts(prev => [...prev, ...newPosts])
        }
        
        setHasMore(result.data.hasMore)
        setPage(currentPage + 1)

        // Load user data for posts
        if (newPosts.length > 0) {
          const userIds = [...new Set(newPosts.map((post: Post) => post.authorId))] as string[]
          // Only log in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Loading user data for:', userIds)
          }
          
          // Check cache for users first
          const usersToLoad: string[] = []
          const newUsers: Record<string, User> = {}
          
          userIds.forEach((userId: string) => {
            const cachedUser = getCachedUser(userId)
            if (cachedUser) {
              newUsers[userId] = cachedUser
            } else {
              usersToLoad.push(userId)
            }
          })
          
          // Load only uncached users
          if (usersToLoad.length > 0) {
            const userPromises = usersToLoad.map((userId) => execute(`/api/users/${userId}`))
            const userResults = await Promise.all(userPromises)

            userResults.forEach((result) => {
              if (result.success && result.data) {
                const user = result.data as User
                newUsers[user.id] = user
                cacheUser(user) // Cache the user
              }
            })
          }

          setUsers((prev) => ({ ...prev, ...newUsers }))
        }
      } else {
        console.error('Failed to load posts:', result.error)
        setError(result.error || 'Failed to load posts')
      }
    } catch (error) {
      console.error('Error loading posts:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setIsLoadingMore(false)
    }
  }, [execute, page, getCachedPosts, getCachedUsers, getCachedUser, needsRefresh, cachePosts, cacheUser])

  useEffect(() => {
    loadPosts(true)
  }, [])

  // Background refresh for stale data
  useEffect(() => {
    const refreshStaleData = () => {
      if (isRefreshing) return
      
      setIsRefreshing(true)
      // Refresh current page if it's stale
      if (needsRefresh(page - 1)) {
        console.log('Background refreshing stale data...')
        loadPosts(false).finally(() => setIsRefreshing(false))
      } else {
        setIsRefreshing(false)
      }
    }

    // Set up periodic refresh every 2 minutes
    const interval = setInterval(refreshStaleData, 2 * 60 * 1000)
    
    // Also refresh when user becomes active
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshStaleData()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [page, needsRefresh, loadPosts, isRefreshing])

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMore && !loadingMore && !loading && !isLoadingMore) {
          console.log('Loading more posts...')
          loadPosts(false)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    )

    if (loadingRef.current) {
      observer.observe(loadingRef.current)
    }

    return () => {
      if (loadingRef.current) {
        observer.unobserve(loadingRef.current)
      }
    }
  }, [hasMore, loadingMore, loading, isLoadingMore, loadPosts])

  const handlePostCreated = (newPost: Post) => {
    // Check if this is an optimistic post (temp ID) or real post
    const isOptimistic = newPost.id.startsWith('temp-')
    
    setPosts(prev => {
      if (isOptimistic) {
        // Add optimistic post to top of feed immediately
        return [newPost, ...prev]
      } else {
        // Replace optimistic post with real post
        // Find and replace any optimistic post with the same content
        const optimisticIndex = prev.findIndex(post => 
          post.id.startsWith('temp-') && post.content === newPost.content
        )
        
        if (optimisticIndex !== -1) {
          // Replace the optimistic post with the real post
          const updatedPosts = [...prev]
          updatedPosts[optimisticIndex] = newPost
          return updatedPosts
        } else {
          // No optimistic post found, add as new post
          return [newPost, ...prev]
        }
      }
    })
    
    // Only cache real posts
    if (!isOptimistic) {
      addCachedPost(newPost)
    }
  }

  const handleComment = (postId: string) => {
    console.log('Comment clicked for post:', postId)
    // TODO: Implement comment functionality (modal, navigation, etc.)
  }

  const handleDelete = (postId: string) => {
    // Remove the post from the local state
    setPosts(posts.filter(p => p.id !== postId))
    removeCachedPost(postId) // Remove from cache
  }

  const handleLike = (postId: string) => {
    // Update local state
    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, likesCount: p.likesCount + 1 }
        : p
    ))
    
    // Update cache
    updateCachedPost(postId, { likesCount: posts.find(p => p.id === postId)?.likesCount || 0 + 1 })
  }

  const filteredPosts = posts

  const renderPostsFeed = () => (
    <div className="space-y-4">
      {loading && posts.length === 0 ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 border rounded-lg">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-16 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-destructive">
            <p className="text-lg font-medium mb-2">Error loading posts</p>
            <p className="text-sm">{error}</p>
            <Button 
              onClick={() => loadPosts(true)} 
              className="mt-4"
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        </div>
      ) : !loading && posts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium mb-2">No posts yet</p>
            <p className="text-sm">Be the first to share something with the community!</p>
          </div>
        </div>
      ) : filteredPosts.length > 0 ? (
        filteredPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            author={users[post.authorId]}
            onLike={handleLike}
            onComment={(postId) => {
              // Handle comment navigation
              console.log('Navigate to post comments:', postId)
            }}
            onDelete={handleDelete}
          />
        ))
      ) : (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium mb-2">No posts found</p>
            <p className="text-sm">
              Be the first to share something with the community!
            </p>
          </div>
        </div>
      )}

      {/* Cache Status and Refresh Button */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-xs text-muted-foreground">
          {isRefreshing ? 'Refreshing...' : 'Cached data'}
        </div>
        <LoadingButton
          variant="ghost"
          size="sm"
          onClick={() => {
            // Only log in development
            if (process.env.NODE_ENV === 'development') {
              console.log('Manual refresh triggered')
            }
            setRefreshError(null)
            loadPosts(true)
          }}
          loading={loading || loadingMore}
          loadingText="Refreshing..."
          error={refreshError}
          onRetry={() => setRefreshError(null)}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </LoadingButton>
      </div>

      {/* Infinite Scroll Loading Indicator */}
      {hasMore && filteredPosts.length > 0 && (
        <div ref={loadingRef} className="flex justify-center pt-6">
          {loadingMore ? (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading more posts...</span>
            </div>
          ) : (
            <div className="h-4" /> // Invisible trigger element
          )}
        </div>
      )}

      {/* End of feed message */}
      {!hasMore && filteredPosts.length > 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">
            You've reached the end of the feed
          </p>
        </div>
      )}
    </div>
  )

  return (
    <div>

      {/* Main Content */}
      <div>
        {/* Mobile Tabs */}
        <div className="md:hidden mb-6">
          <Tabs defaultValue="feed" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1">
              <TabsTrigger value="activity" className="flex flex-col gap-1 h-auto py-2 px-2">
                <Activity className="h-4 w-4" />
                <span className="text-xs">Activity</span>
              </TabsTrigger>
              <TabsTrigger value="feed" className="flex flex-col gap-1 h-auto py-2 px-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs">Feed</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="flex flex-col gap-1 h-auto py-2 px-2">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Events & News</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-4">
              <ActivitySidebar />
            </TabsContent>

            <TabsContent value="feed" className="mt-4">
              <div className="space-y-6">
                {user ? (
                  <EnhancedPostComposer onPostCreated={handlePostCreated} />
                ) : (
                  <LoginPrompt />
                )}
                {renderPostsFeed()}
              </div>
            </TabsContent>

            <TabsContent value="events" className="mt-4">
              <div className="text-center text-muted-foreground">
                Events are shown in the sidebar on the right
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop Layout - 3 Column */}
        <div className="hidden md:grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Activity Feed */}
          <div className="lg:col-span-3">
            <div className="sticky top-0">
              <ActivitySidebar />
            </div>
          </div>

          {/* Center Column - Main Feed */}
          <div className="lg:col-span-6">
            <div className="space-y-6">
              {user ? (
                <EnhancedPostComposer onPostCreated={handlePostCreated} />
              ) : (
                <LoginPrompt />
              )}
              {renderPostsFeed()}
            </div>
          </div>

          {/* Right Sidebar - Events & News */}
          <div className="lg:col-span-3">
            <div className="sticky top-4">
              <EventsSidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
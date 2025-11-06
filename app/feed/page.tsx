'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/use-api'
import { useSession } from '@/store/useSession'
import { PostCard } from '@/components/posts/post-card'
import { PostComposer } from '@/components/posts/post-composer'
import { ActivitySidebar } from '@/components/feed/activity-sidebar'
import { EventsSidebar } from '@/components/feed/events-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Post, User } from '@/lib/types'

export default function FeedPage() {
  const { execute } = useApi()
  const { user } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [authors, setAuthors] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async (loadMore = false) => {
    if (!loadMore) {
      setLoading(true)
      setOffset(0)
    }

    try {
      const result = await execute(`/api/posts?limit=20&offset=${loadMore ? offset : 0}`)
      
      if (result.success && result.data?.posts) {
        const newPosts: Post[] = result.data.posts as Post[]
        if (loadMore) {
          setPosts(prev => [...prev, ...newPosts])
        } else {
          setPosts(newPosts)
        }
        setHasMore(result.data.hasMore || false)
        setOffset(loadMore ? offset + newPosts.length : newPosts.length)

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

  const loadAuthors = async (authorIds: string[]) => {
    try {
      const results = await Promise.allSettled(
        authorIds.map(id => execute(`/api/users/${id}`))
      )
      
      const newAuthors: Record<string, User> = {}
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success && result.value.data) {
          newAuthors[authorIds[index]] = result.value.data
        }
      })
      
      setAuthors(prev => ({ ...prev, ...newAuthors }))
    } catch (error) {
      console.error('Failed to load authors:', error)
    }
  }

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
              <PostComposer onPostCreated={handlePostCreated} />
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
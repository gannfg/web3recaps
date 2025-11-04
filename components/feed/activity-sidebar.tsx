"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useApi } from "@/hooks/use-api"
import { formatRelativeTime } from "@/lib/utils"
import { 
  Users, 
  FolderOpen, 
  Bell, 
  TrendingUp, 
  Star,
  ExternalLink,
  Calendar,
  Zap,
  MessageSquare,
  Newspaper,
  Plus,
  Heart,
  Eye,
  RefreshCw
} from "lucide-react"
import Link from "next/link"
import type { Project, Team, User } from "@/lib/types"

interface ActivityItem {
  id: string
  type: 'post_created' | 'event_created' | 'project_created' | 'team_created' | 'comment_added' | 'news_published'
  title: string
  description: string
  author?: {
    id: string
    display_name?: string
    avatar_url?: string
    role: string
  }
  entity?: {
    id: string
    type: string
    [key: string]: any
  }
  timestamp: string
  priority: 'low' | 'medium' | 'high'
}

export function ActivitySidebar() {
  const { execute } = useApi()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadActivities()
  }, [])

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadActivities(true)
    }, 2 * 60 * 1000) // 2 minutes

    return () => clearInterval(interval)
  }, [])

  const loadActivities = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    
    try {
      const result = await execute('/api/activity?limit=15')
      
      if (result.success && result.data?.activities) {
        setActivities(result.data.activities)
      } else {
        console.error('Failed to load activities:', result.error)
        setActivities([])
      }
    } catch (error) {
      console.error('Failed to load activities:', error)
      setActivities([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadActivities(true)
  }

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'post_created':
        return <MessageSquare className="h-4 w-4" />
      case 'event_created':
        return <Calendar className="h-4 w-4" />
      case 'project_created':
        return <FolderOpen className="h-4 w-4" />
      case 'team_created':
        return <Users className="h-4 w-4" />
      case 'comment_added':
        return <Plus className="h-4 w-4" />
      case 'news_published':
        return <Newspaper className="h-4 w-4" />
      default:
        return <Zap className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: ActivityItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-500'
      case 'medium':
        return 'text-yellow-500'
      case 'low':
        return 'text-green-500'
      default:
        return 'text-muted-foreground'
    }
  }

  if (loading) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-lg">Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Activity Feed
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className={`flex-shrink-0 ${getPriorityColor(activity.priority)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      {activity.author && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={activity.author.avatar_url || "/placeholder-user.jpg"} />
                          <AvatarFallback className="text-xs">
                            {activity.author.display_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-foreground truncate">
                          {activity.author?.display_name || "Anonymous"}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {activity.title}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {activity.description}
                  </p>

                  {/* Entity-specific info and actions */}
                  {activity.entity && (
                    <div className="mt-2 flex items-center gap-2">
                      {activity.entity.type === 'post' && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {activity.entity.postType}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart className="h-3 w-3" />
                            {activity.entity.likesCount}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            {activity.entity.commentsCount}
                          </div>
                          <Link href={`/feed#post-${activity.entity.shortId}`}>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </>
                      )}

                      {activity.entity.type === 'event' && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {activity.entity.eventType}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {new Date(activity.entity.eventDate).toLocaleDateString()}
                          </div>
                          <Link href={`/events/${activity.entity.id}`}>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </>
                      )}

                      {activity.entity.type === 'project' && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {activity.entity.projectType}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart className="h-3 w-3" />
                            {activity.entity.likesCount}
                          </div>
                          <Link href={`/projects/${activity.entity.id}`}>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </>
                      )}

                      {activity.entity.type === 'team' && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {activity.entity.status}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {activity.entity.memberCount}/{activity.entity.maxMembers} members
                          </div>
                          <Link href={`/teams/${activity.entity.id}`}>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </>
                      )}

                      {activity.entity.type === 'news' && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            News
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            {activity.entity.viewCount}
                          </div>
                          <Link href={`/news/${activity.entity.slug}`}>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              Read <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </>
                      )}

                      {activity.entity.type === 'comment' && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            Comment
                          </Badge>
                          <Link href={`/feed#post-${activity.entity.postShortId}`}>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              View Post <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {activities.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useApi } from "@/hooks/use-api"
import { formatRelativeTime, formatDate } from "@/lib/utils"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ExternalLink,
  Newspaper,
  TrendingUp,
  Star
} from "lucide-react"
import Link from "next/link"
import type { Event } from "@/lib/types"
import { LatestArticlesWidget } from "@/components/news/news-articles-widget"

export function EventsSidebar() {
  const { execute } = useApi()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEventsAndNews()
  }, []) // Empty dependency array to prevent loops

  const loadEventsAndNews = async () => {
    setLoading(true)
    try {
      // Load upcoming events
      const eventsResult = await execute('/api/events?limit=5&status=published')
      
      if (eventsResult.success && eventsResult.data?.events) {
        setEvents(eventsResult.data.events)
      }
    } catch (error) {
      console.error('Failed to load events and news:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEventTypeIcon = (type: Event['eventType']) => {
    switch (type) {
      case 'workshop':
        return <Users className="h-4 w-4" />
      case 'hackathon':
        return <Star className="h-4 w-4" />
      case 'study_group':
        return <TrendingUp className="h-4 w-4" />
      case '1on1':
        return <Users className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const getEventTypeColor = (type?: string) => {
    if (!type) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    
    switch (type) {
      case 'workshop':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'hackathon':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'study_group':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case '1on1':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      case 'meetup':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300'
      case 'conference':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
      case 'networking':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Latest News</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {events.length > 0 ? (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm line-clamp-2">
                        {event.title}
                      </h4>
                      <Badge className={`text-xs ${getEventTypeColor(event.eventType)}`}>
                        {(event.eventType || 'event').replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {event.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(event.eventDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.startTime}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {event.currentAttendeesCount}/{event.maxAttendees}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {event.skillLevel} level
                      </Badge>
                      <Link href={`/events/${event.id}`}>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          View <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No upcoming events</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Latest News */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Latest News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LatestArticlesWidget />
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/use-api'
import { EnhancedEventCard } from '@/components/events/enhanced-event-card'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Search, Calendar, Filter } from 'lucide-react'
import type { Event, Booking, User } from '@/lib/types'

export default function EventsPage() {
  const { execute } = useApi()
  const [events, setEvents] = useState<Event[]>([])
  const [bookings, setBookings] = useState<Record<string, Booking>>({})
  const [organizers, setOrganizers] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('published')

  useEffect(() => {
    loadEvents()
  }, [statusFilter])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        limit: '50',
      })
      
      if (eventTypeFilter !== 'all') {
        params.append('type', eventTypeFilter)
      }

      const result = await execute(`/api/events?${params.toString()}`)
      
      if (result.success && result.data?.events) {
        const eventsData = result.data.events
        setEvents(eventsData)

        // Extract organizers
        const organizersMap: Record<string, User> = {}
        eventsData.forEach((event: Event) => {
          if (event.creatorId && (event as any).creator) {
            organizersMap[event.creatorId] = (event as any).creator
          }
        })
        setOrganizers(organizersMap)

        // Load bookings if user is authenticated
        await loadBookings(eventsData.map((e: Event) => e.id))
      }
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBookings = async (eventIds: string[]) => {
    try {
      // Only try to load bookings if we have event IDs
      if (eventIds.length === 0) return
      
      const results = await Promise.allSettled(
        eventIds.map(id => execute(`/api/events/${id}/bookings`))
      )
      
      const bookingsMap: Record<string, Booking> = {}
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success && result.value.data?.booking) {
          bookingsMap[eventIds[index]] = result.value.data.booking
        }
      })
      
      setBookings(bookingsMap)
    } catch (error) {
      // Silently fail - bookings are optional
      console.error('Failed to load bookings:', error)
    }
  }

  const handleBookingChange = (eventId: string, booking: Booking | null) => {
    setBookings(prev => {
      if (booking) {
        return { ...prev, [eventId]: booking }
      } else {
        const { [eventId]: _, ...rest } = prev
        return rest
      }
    })
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = !searchQuery || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = eventTypeFilter === 'all' || event.eventType === eventTypeFilter
    
    return matchesSearch && matchesType
  })

  if (loading && events.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Events
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover and join upcoming Web3 events
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadEvents}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="workshop">Workshop</SelectItem>
            <SelectItem value="hackathon">Hackathon</SelectItem>
            <SelectItem value="study_group">Study Group</SelectItem>
            <SelectItem value="1on1">1-on-1</SelectItem>
            <SelectItem value="meetup">Meetup</SelectItem>
            <SelectItem value="conference">Conference</SelectItem>
            <SelectItem value="networking">Networking</SelectItem>
            <SelectItem value="social">Social</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {searchQuery || eventTypeFilter !== 'all' 
                ? 'No events found matching your filters.' 
                : 'No events available at the moment.'}
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((event) => (
            <EnhancedEventCard
              key={event.id}
              event={event}
              booking={bookings[event.id]}
              organizer={organizers[event.creatorId]}
              onBookingChange={handleBookingChange}
            />
          ))
        )}
      </div>
    </div>
  )
}

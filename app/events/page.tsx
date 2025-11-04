"use client"

import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { EnhancedEventCard } from "@/components/events/enhanced-event-card"
import { EnhancedEventCreateForm } from "@/components/events/enhanced-event-create-form"

// Lazy load the calendar component since it's heavy
const EnhancedEventsCalendar = lazy(() => import("@/components/events/enhanced-events-calendar").then(module => ({ default: module.EnhancedEventsCalendar })))
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RoleGate } from "@/components/auth/role-gate"
import { useApi } from "@/hooks/use-api"
import { Search, Filter, Plus, Calendar, ChevronDown, ChevronUp } from "lucide-react"
import type { Event, Booking, User } from "@/lib/types"

const EVENT_TYPE_FILTERS = [
  { value: "all", label: "All Events" },
  { value: "workshop", label: "Workshops" },
  { value: "1on1", label: "1-on-1 Sessions" },
  { value: "study_group", label: "Study Groups" },
  { value: "hackathon", label: "Hackathons" },
  { value: "meetup", label: "Meetups" },
  { value: "conference", label: "Conferences" },
  { value: "networking", label: "Networking" },
]

const SKILL_LEVEL_FILTERS = [
  { value: "all", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
]

export default function EventsPage() {
  const { execute } = useApi()
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [bookings, setBookings] = useState<Record<string, Booking>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedSkillLevel, setSelectedSkillLevel] = useState("all")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(true)
  const [showCalendar, setShowCalendar] = useState(false)

  const loadEvents = useCallback(async () => {
    setLoading(true)

    const params = new URLSearchParams({
      type: selectedType,
      skillLevel: selectedSkillLevel,
      upcoming: showUpcomingOnly.toString(),
      limit: "20",
    })

    const result = await execute(`/api/events?${params}`)

    if (result.success && result.data) {
      const eventsData = result.data.events
      setEvents(eventsData)

      // Load user bookings (in a real app, this would be a separate API call)
      // For demo, we'll simulate some bookings
      const mockBookings: Record<string, Booking> = {}
      eventsData.slice(0, 2).forEach((event: Event, index: number) => {
        mockBookings[event.id] = {
          id: `booking-${index}`,
          eventId: event.id,
          userId: "current-user",
          status: index === 0 ? "confirmed" : "waitlisted",
          bookedAt: new Date().toISOString(),
          checkedIn: false,
          xpAwarded: false,
        }
      })
      setBookings(mockBookings)
    }

    setLoading(false)
  }, [selectedType, selectedSkillLevel, showUpcomingOnly, execute])

  useEffect(() => {
    loadEvents()
  }, [selectedType, selectedSkillLevel, showUpcomingOnly])

  const handleEventCreated = useCallback((newEvent: Event) => {
    setEvents(prev => [newEvent, ...prev])
    // Navigate to the event details page
    if (newEvent.id) {
      router.push(`/events/${newEvent.id}`)
    }
  }, [router])

  const handleEventDeleted = useCallback((eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId))
  }, [])

  const handleBookingChange = useCallback((eventId: string, booking: Booking | null) => {
    setBookings(prev => {
      if (booking) {
        return { ...prev, [eventId]: booking }
      } else {
        const newBookings = { ...prev }
        delete newBookings[eventId]
        return newBookings
      }
    })

    // Update event attendance count
    setEvents(prev => prev.map((event) => {
      if (event.id === eventId) {
        return {
          ...event,
          currentAttendeesCount: booking ? event.currentAttendeesCount + 1 : Math.max(0, event.currentAttendeesCount - 1),
        }
      }
      return event
    }))
  }, [])

  const handleCalendarEventClick = useCallback((event: Event) => {
    setSearchQuery(event.title)
  }, [])

  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    
    const query = searchQuery.toLowerCase();
    return events.filter((event) =>
      event.title.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [events, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Community Events</h1>
          <p className="text-muted-foreground">Learn, build, and connect with fellow Solana developers</p>
        </div>
        <RoleGate requiredRole="Student">
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </RoleGate>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events, topics, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSkillLevel} onValueChange={setSelectedSkillLevel}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SKILL_LEVEL_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={showUpcomingOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUpcomingOnly(!showUpcomingOnly)}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            {showUpcomingOnly ? "Upcoming" : "All Events"}
          </Button>
          <Button
            variant={showCalendar ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCalendar(!showCalendar)}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Calendar View
            {showCalendar ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {["solana", "rust", "defi", "nft", "beginner-friendly", "hands-on"].map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="cursor-pointer hover:bg-secondary"
              onClick={() => setSearchQuery(tag)}
            >
              #{tag}
            </Badge>
          ))}
        </div>
      </div>

      {showCalendar && (
        <div className="animate-in slide-in-from-top-2 duration-300">
          <Suspense fallback={<div className="text-center py-8">Loading calendar...</div>}>
            <EnhancedEventsCalendar 
              events={filteredEvents} 
              bookings={bookings}
              onEventClick={handleCalendarEventClick}
            onBookEvent={(eventId) => {
              // Handle booking from calendar
              const event = events.find(e => e.id === eventId)
              if (event) {
                handleBookingChange(eventId, {
                  id: `booking-${Date.now()}`,
                  eventId,
                  userId: "current-user",
                  status: "confirmed",
                  bookedAt: new Date().toISOString(),
                  checkedIn: false,
                  xpAwarded: false,
                })
              }
            }}
            onCancelBooking={(eventId) => {
              handleBookingChange(eventId, null)
            }}
          />
          </Suspense>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8">
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-muted-foreground">
              {searchQuery ? "No events found matching your search." : "No events scheduled yet."}
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <EnhancedEventCard
              key={event.id}
              event={event}
              booking={bookings[event.id]}
              onBookingChange={handleBookingChange}
              onDelete={handleEventDeleted}
            />
          ))
        )}
      </div>

        <EnhancedEventCreateForm open={showCreateForm} onOpenChange={setShowCreateForm} onEventCreated={handleEventCreated} />
    </div>
  )
}

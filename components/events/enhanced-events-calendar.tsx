"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Star,
  Filter,
  Grid3X3,
  List,
  Eye,
  Globe,
  Building
} from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import type { Event, Booking, User } from "@/lib/types"

interface EnhancedEventsCalendarProps {
  events: Event[]
  bookings?: Record<string, Booking>
  organizers?: Record<string, User>
  onEventClick?: (event: Event) => void
  onBookEvent?: (eventId: string) => void
  onCancelBooking?: (eventId: string) => void
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const EVENT_TYPE_COLORS = {
  workshop: "bg-blue-500/90 text-blue-50",
  "1on1": "bg-green-500/90 text-green-50",
  study_group: "bg-purple-500/90 text-purple-50",
  hackathon: "bg-orange-500/90 text-orange-50",
  meetup: "bg-pink-500/90 text-pink-50",
  conference: "bg-indigo-500/90 text-indigo-50",
  networking: "bg-cyan-500/90 text-cyan-50",
  marketing: "bg-emerald-500/90 text-emerald-50",
  social: "bg-rose-500/90 text-rose-50",
} as const

export function EnhancedEventsCalendar({ 
  events, 
  bookings = {}, 
  organizers = {}, 
  onEventClick, 
  onBookEvent, 
  onCancelBooking 
}: EnhancedEventsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month")
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showEventDetails, setShowEventDetails] = useState(false)
  const [filterType, setFilterType] = useState("all")
  const [filterSkillLevel, setFilterSkillLevel] = useState("all")

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Filter events
  const filteredEvents = events.filter(event => {
    if (filterType !== "all" && event.eventType !== filterType) return false
    if (filterSkillLevel !== "all" && event.skillLevel !== filterSkillLevel) return false
    return true
  })

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // Create calendar grid
  const calendarDays: Array<{
    day: number
    isCurrentMonth: boolean
    date: Date
    events?: Event[]
  }> = []

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, daysInPrevMonth - i),
    })
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: true,
      date: new Date(year, month, day),
    })
  }

  // Next month days to fill grid
  const remainingDays = 42 - calendarDays.length
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(year, month + 1, day),
    })
  }

  // Group events by date
  const eventsByDate = filteredEvents.reduce(
    (acc, event) => {
      const eventDate = new Date(event.eventDate).toDateString()
      if (!acc[eventDate]) acc[eventDate] = []
      acc[eventDate].push(event)
      return acc
    },
    {} as Record<string, Event[]>,
  )

  // Get week view days
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    
    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      weekDays.push(day)
    }
    return weekDays
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(new Date(year, month + (direction === "next" ? 1 : -1), 1))
  }

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7))
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isPast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const getEventTypeColor = (type: string) => {
    return EVENT_TYPE_COLORS[type as keyof typeof EVENT_TYPE_COLORS] || "bg-gray-500"
  }


  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setShowEventDetails(true)
    onEventClick?.(event)
  }

  const getBookingStatus = (eventId: string) => {
    const booking = bookings[eventId]
    if (!booking) return null
    return booking.status
  }

  const canBookEvent = (event: Event) => {
    const booking = bookings[event.id]
    return event.status === "published" && 
      (event.capacityType === "unlimited" || event.currentAttendeesCount < event.maxAttendees) &&
      !booking
  }

  const canCancelBooking = (eventId: string) => {
    const booking = bookings[eventId]
    return booking && (booking.status === "confirmed" || booking.status === "waitlisted")
  }

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-1">
      {calendarDays.map((calendarDay, index) => {
        const dayEvents = eventsByDate[calendarDay.date.toDateString()] || []
        const isCurrentDay = isToday(calendarDay.date)
        const isPastDay = isPast(calendarDay.date)

        return (
          <div
            key={index}
            className={`
              min-h-[100px] p-2 border rounded-lg transition-colors hover:bg-muted/50
              ${calendarDay.isCurrentMonth ? "bg-background" : "bg-muted/20"}
              ${isCurrentDay ? "ring-2 ring-primary bg-primary/5" : ""}
              ${isPastDay ? "opacity-60" : ""}
            `}
          >
            <div
              className={`
                text-sm font-medium mb-2 flex items-center justify-between
                ${calendarDay.isCurrentMonth ? "text-foreground" : "text-muted-foreground"}
                ${isCurrentDay ? "text-primary font-bold" : ""}
              `}
            >
              <span>{calendarDay.day}</span>
              {dayEvents.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {dayEvents.length}
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event) => {
                const bookingStatus = getBookingStatus(event.id)
                const isBooked = !!bookingStatus
                const isWaitlisted = bookingStatus === "waitlisted"
                const isConfirmed = bookingStatus === "confirmed"

                return (
                  <div 
                    key={event.id} 
                    onClick={() => handleEventClick(event)} 
                    className="cursor-pointer group"
                  >
                    <div
                      className={`
                        w-full h-6 rounded-md text-xs px-2 flex items-center gap-1 font-medium
                        ${getEventTypeColor(event.eventType)} group-hover:opacity-80 transition-opacity
                        ${isBooked ? "ring-2 ring-white/50 shadow-sm" : ""}
                      `}
                    >
                      <span className="truncate text-[10px] font-medium flex-1">{event.title}</span>
                      {isBooked && (
                        <span className="text-xs ml-auto flex-shrink-0">
                          {isWaitlisted ? "⏳" : isConfirmed ? "✓" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}

              {dayEvents.length > 3 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderWeekView = () => {
    const weekDays = getWeekDays()
    
    return (
      <div className="space-y-2">
        {weekDays.map((day, index) => {
          const dayEvents = eventsByDate[day.toDateString()] || []
          const isCurrentDay = isToday(day)
          const isPastDay = isPast(day)

          return (
            <div
              key={index}
              className={`
                p-4 border rounded-lg transition-colors hover:bg-muted/50
                ${isCurrentDay ? "ring-2 ring-primary bg-primary/5" : ""}
                ${isPastDay ? "opacity-60" : ""}
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`
                      text-lg font-semibold
                      ${isCurrentDay ? "text-primary" : "text-foreground"}
                    `}
                  >
                    {day.getDate()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {DAYS[day.getDay()]}
                  </div>
                  {dayEvents.length > 0 && (
                    <Badge variant="secondary">
                      {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const bookingStatus = getBookingStatus(event.id)
                  const isBooked = !!bookingStatus
                  const organizer = organizers[event.creatorId]

                  return (
                    <div 
                      key={event.id} 
                      onClick={() => handleEventClick(event)} 
                      className="cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.eventType)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{event.title}</span>
                            {event.isFeatured && <Star className="h-3 w-3 text-yellow-500" />}
                            {isBooked && (
                              <Badge variant="outline" className="text-xs">
                                {bookingStatus === "waitlisted" ? "Waitlisted" : "Booked"}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.startTime} - {event.endTime}
                            </div>
                            <div className="flex items-center gap-1">
                              {event.locationType === "online" ? (
                                <Globe className="h-3 w-3" />
                              ) : (
                                <MapPin className="h-3 w-3" />
                              )}
                              <span className="truncate max-w-[200px]">{event.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {event.currentAttendeesCount}/{event.capacityType === "unlimited" ? "∞" : event.maxAttendees}
                            </div>
                          </div>
                        </div>
                        {organizer && (
                          <div className="text-xs text-muted-foreground">
                            by {organizer.displayName || "Organizer"}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderListView = () => {
    const sortedEvents = [...filteredEvents].sort((a, b) => 
      new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    )

    return (
      <div className="space-y-4">
        {sortedEvents.map((event) => {
          const bookingStatus = getBookingStatus(event.id)
          const isBooked = !!bookingStatus
          const organizer = organizers[event.creatorId]

          return (
            <div 
              key={event.id} 
              onClick={() => handleEventClick(event)} 
              className="cursor-pointer group"
            >
              <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`w-4 h-4 rounded-full ${getEventTypeColor(event.eventType)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{event.title}</span>
                    {event.isFeatured && <Star className="h-4 w-4 text-yellow-500" />}
                    <Badge variant="outline" className="text-xs">
                      {event.eventType.replace("_", " ").toUpperCase()}
                    </Badge>
                    {isBooked && (
                      <Badge variant="secondary" className="text-xs">
                        {bookingStatus === "waitlisted" ? "Waitlisted" : "Booked"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(event.eventDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {event.startTime} - {event.endTime}
                    </div>
                    <div className="flex items-center gap-1">
                      {event.locationType === "online" ? (
                        <Globe className="h-4 w-4" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      <span className="truncate max-w-[200px]">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {event.currentAttendeesCount}/{event.capacityType === "unlimited" ? "∞" : event.maxAttendees}
                    </div>
                  </div>
                </div>
                {organizer && (
                  <div className="text-sm text-muted-foreground">
                    by {organizer.displayName || "Organizer"}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Events Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="workshop">Workshops</SelectItem>
                <SelectItem value="1on1">1-on-1</SelectItem>
                <SelectItem value="study_group">Study Groups</SelectItem>
                <SelectItem value="hackathon">Hackathons</SelectItem>
                <SelectItem value="meetup">Meetups</SelectItem>
                <SelectItem value="conference">Conferences</SelectItem>
                <SelectItem value="networking">Networking</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterSkillLevel} onValueChange={setFilterSkillLevel}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>

            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "month" | "week" | "list")}>
              <TabsList>
                <TabsTrigger value="month">
                  <Grid3X3 className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="list">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        
        <CardContent>
          {viewMode === "month" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {MONTHS[month]} {year}
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Days header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {renderMonthView()}
            </>
          )}

          {viewMode === "week" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Week of {getWeekDays()[0].toLocaleDateString()} - {getWeekDays()[6].toLocaleDateString()}
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {renderWeekView()}
            </>
          )}

          {viewMode === "list" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  All Events ({filteredEvents.length})
                </h3>
              </div>

              {renderListView()}
            </>
          )}

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-3 text-xs">
            {Object.entries(EVENT_TYPE_COLORS).map(([type, colorClass]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${colorClass}`}></div>
                <span className="capitalize text-muted-foreground">{type.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${getEventTypeColor(selectedEvent?.eventType || '')}`}></div>
              {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription>
              Event details and booking information
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-6">
              {selectedEvent.description && (
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-muted-foreground">{selectedEvent.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Date & Time</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(selectedEvent.eventDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.startTime} - {selectedEvent.endTime}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Location</h4>
                  <div className="flex items-center gap-2 text-sm">
                    {selectedEvent.locationType === "online" ? (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{selectedEvent.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedEvent.currentAttendeesCount}/{selectedEvent.capacityType === "unlimited" ? "∞" : selectedEvent.maxAttendees} attendees
                    </span>
                  </div>
                </div>
              </div>

              {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedEvent.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {canBookEvent(selectedEvent) && (
                  <Button onClick={() => onBookEvent?.(selectedEvent.id)} className="flex-1">
                    Book Event
                  </Button>
                )}

                {canCancelBooking(selectedEvent.id) && (
                  <Button 
                    variant="destructive" 
                    onClick={() => onCancelBooking?.(selectedEvent.id)} 
                    className="flex-1"
                  >
                    Cancel Booking
                  </Button>
                )}

                <Button variant="outline" onClick={() => setShowEventDetails(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

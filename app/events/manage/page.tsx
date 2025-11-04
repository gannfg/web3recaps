"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { formatRelativeTime } from "@/lib/utils"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  Star, 
  Edit, 
  Trash2, 
  Eye,
  UserCheck,
  UserX,
  BarChart3,
  TrendingUp,
  Activity,
  Mail
} from "lucide-react"
import { EventNotifications } from "@/components/events/event-notifications"
import type { Event, Booking, User } from "@/lib/types"

interface EventStats {
  totalEvents: number
  totalAttendees: number
  upcomingEvents: number
  completedEvents: number
  totalRevenue: number
}

interface AttendeeData {
  id: string
  name: string
  email: string
  status: string
  bookedAt: string
  checkedIn: boolean
  checkedInAt?: string
}

export default function EventManagementPage() {
  const { user } = useSession()
  const { execute, loading } = useApi()
  const { toast } = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [bookings, setBookings] = useState<Record<string, Booking[]>>({})
  const [attendees, setAttendees] = useState<Record<string, AttendeeData[]>>({})
  const [stats, setStats] = useState<EventStats>({
    totalEvents: 0,
    totalAttendees: 0,
    upcomingEvents: 0,
    completedEvents: 0,
    totalRevenue: 0,
  })
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showAttendees, setShowAttendees] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const loadEvents = async () => {
    if (!user) return

    try {
      // Get user's events
      const result = await execute(`/api/events?creator=${user.id}&limit=100`)
      if (result.success && result.data) {
        setEvents(result.data.events)
        
        // Calculate stats
        const eventStats = {
          totalEvents: result.data.events.length,
          totalAttendees: result.data.events.reduce((sum: number, event: Event) => sum + event.currentAttendeesCount, 0),
          upcomingEvents: result.data.events.filter((event: Event) => 
            new Date(event.eventDate) >= new Date() && event.status === 'published'
          ).length,
          completedEvents: result.data.events.filter((event: Event) => 
            event.status === 'completed'
          ).length,
          totalRevenue: result.data.events.reduce((sum: number, event: Event) => sum + (event.cost * event.currentAttendeesCount), 0),
        }
        setStats(eventStats)

        // Load bookings for each event
        const bookingPromises = result.data.events.map((event: Event) => 
          execute(`/api/events/${event.id}/attendees`)
        )
        const bookingResults = await Promise.all(bookingPromises)
        
        const bookingsData: Record<string, Booking[]> = {}
        const attendeesData: Record<string, AttendeeData[]> = {}
        
        bookingResults.forEach((result, index) => {
          if (result.success && result.data) {
            const eventId = result.data.events[index].id
            bookingsData[eventId] = result.data.bookings || []
            attendeesData[eventId] = result.data.attendees || []
          }
        })
        
        setBookings(bookingsData)
        setAttendees(attendeesData)
      }
    } catch (error) {
      console.error("Error loading events:", error)
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    loadEvents()
  }, [user])

  const handleDeleteEvent = async (eventId: string) => {
    if (!user) return

    try {
      const result = await execute(`/api/events/${eventId}`, {
        method: "DELETE",
        headers: {
          "x-user-id": user.id,
        },
      })

      if (result.success) {
        setEvents(events.filter(event => event.id !== eventId))
        toast({
          title: "Event Deleted",
          description: "Event has been deleted successfully",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete event",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting event:", error)
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      })
    }
  }

  const handleCheckIn = async (eventId: string, attendeeId: string) => {
    try {
      const result = await execute(`/api/events/${eventId}/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({ attendeeId }),
      })

      if (result.success) {
        // Update local state
        setAttendees(prev => ({
          ...prev,
          [eventId]: prev[eventId]?.map(attendee => 
            attendee.id === attendeeId 
              ? { ...attendee, checkedIn: true, checkedInAt: new Date().toISOString() }
              : attendee
          ) || []
        }))
        
        toast({
          title: "Check-in Successful",
          description: "Attendee has been checked in",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to check in attendee",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error checking in attendee:", error)
      toast({
        title: "Error",
        description: "Failed to check in attendee",
        variant: "destructive",
      })
    }
  }

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-green-100 text-green-800"
      case "draft": return "bg-gray-100 text-gray-800"
      case "ongoing": return "bg-blue-100 text-blue-800"
      case "completed": return "bg-purple-100 text-purple-800"
      case "cancelled": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800"
      case "waitlisted": return "bg-yellow-100 text-yellow-800"
      case "cancelled": return "bg-red-100 text-red-800"
      case "attended": return "bg-blue-100 text-blue-800"
      case "no_show": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (!user) {
    return (
      <div className="container max-w-6xl mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event Management</h1>
          <p className="text-muted-foreground">Please log in to manage your events</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Event Management</h1>
          <p className="text-muted-foreground">Manage your events and track attendance</p>
        </div>
        <Button onClick={() => window.location.href = '/events'}>
          <Calendar className="h-4 w-4 mr-2" />
          View All Events
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttendees}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Your Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Events</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Attendees</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{event.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {event.eventType.replace("_", " ").toUpperCase()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(event.eventDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {event.startTime} - {event.endTime}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[200px]">{event.location}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {event.currentAttendeesCount}/{event.capacityType === "unlimited" ? "∞" : event.maxAttendees}
                            </div>
                            {event.waitlistCount > 0 && (
                              <div className="text-xs text-muted-foreground">
                                +{event.waitlistCount} waitlist
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getEventStatusColor(event.status)}>
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEvent(event)
                                setShowAttendees(true)
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEvent(event)
                                setShowNotifications(true)
                              }}
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.location.href = `/events/${event.id}/edit`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteEvent(event.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Attendees Modal */}
      <Dialog open={showAttendees} onOpenChange={setShowAttendees}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Attendees</DialogTitle>
            <DialogDescription>
              Manage attendees for {selectedEvent?.title}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium">Total Attendees</div>
                  <div className="text-2xl font-bold">{selectedEvent.currentAttendeesCount}</div>
                </div>
                <div>
                  <div className="font-medium">Checked In</div>
                  <div className="text-2xl font-bold">
                    {attendees[selectedEvent.id]?.filter(a => a.checkedIn).length || 0}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Waitlist</div>
                  <div className="text-2xl font-bold">{selectedEvent.waitlistCount}</div>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Booked At</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendees[selectedEvent.id]?.map((attendee) => (
                      <TableRow key={attendee.id}>
                        <TableCell className="font-medium">{attendee.name}</TableCell>
                        <TableCell>{attendee.email}</TableCell>
                        <TableCell>
                          <Badge className={getBookingStatusColor(attendee.status)}>
                            {attendee.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatRelativeTime(attendee.bookedAt)}
                        </TableCell>
                        <TableCell>
                          {attendee.checkedIn ? (
                            <Badge className="bg-green-100 text-green-800">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Checked In
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <UserX className="h-3 w-3 mr-1" />
                              Not Checked In
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!attendee.checkedIn && attendee.status === "confirmed" && (
                            <Button
                              size="sm"
                              onClick={() => handleCheckIn(selectedEvent.id, attendee.id)}
                            >
                              Check In
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notifications Modal */}
      {selectedEvent && (
        <EventNotifications
          event={selectedEvent}
          onClose={() => {
            setShowNotifications(false)
            setSelectedEvent(null)
          }}
        />
      )}
    </div>
  )
}

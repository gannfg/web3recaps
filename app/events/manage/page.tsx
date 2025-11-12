"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [startTime, setStartTime] = useState("18:00")
  const [endTime, setEndTime] = useState("20:00")
  const [eventType, setEventType] = useState<Event["eventType"]>("meetup")
  const [location, setLocation] = useState("TBD")
  const [locationType, setLocationType] = useState<Event["locationType"]>("physical")
  const [capacityType, setCapacityType] = useState<Event["capacityType"]>("limited")
  const [maxAttendees, setMaxAttendees] = useState(50)
  const [isPublic, setIsPublic] = useState(true)
  const [skillLevel, setSkillLevel] = useState<Event["skillLevel"]>("all")
  const [xpReward, setXpReward] = useState(20)
  const [cost, setCost] = useState(0)
  const [currency, setCurrency] = useState("USD")

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
        const eventIds: string[] = result.data.events.map((e: Event) => e.id)
        const attendeePromises = eventIds.map((id) => execute(`/api/events/${id}/attendees`))
        const attendeeResults = await Promise.all(attendeePromises)
        
        const bookingsData: Record<string, Booking[]> = {}
        const attendeesData: Record<string, AttendeeData[]> = {}
        
        attendeeResults.forEach((res, index) => {
          if (res.success && res.data) {
            const eventId = eventIds[index]
            attendeesData[eventId] = res.data.attendees || []
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

  const handleCreateEvent = async () => {
    if (!user) return
    if (!title.trim() || !eventDate || !startTime || !endTime) {
      toast({
        title: "Missing fields",
        description: "Title, date, start and end time are required",
        variant: "destructive",
      })
      return
    }
    setCreating(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        eventDate,
        startTime,
        endTime,
        eventType,
        location: location.trim() || "TBD",
        locationType,
        capacityType,
        maxAttendees,
        skillLevel,
        xpReward,
        isPublic,
        isRecurring: false,
        isFeatured: false,
        cost,
        currency,
        tags: [],
      }
      const result = await execute("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify(payload),
      })
      if (result.success) {
        toast({ title: "Event created", description: "Your event has been created" })
        setShowCreate(false)
        setTitle("")
        setDescription("")
        setEventDate("")
        setStartTime("18:00")
        setEndTime("20:00")
        setEventType("meetup")
        setLocation("TBD")
        setLocationType("physical")
        setCapacityType("limited")
        setMaxAttendees(50)
        setIsPublic(true)
        setSkillLevel("all")
        setXpReward(20)
        setCost(0)
        setCurrency("USD")
        loadEvents()
      } else {
        toast({
          title: "Creation failed",
          description: result.error || "Could not create event",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create event",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

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
        <div className="flex items-center gap-2">
          {user?.role === "Admin" && (
            <Button onClick={() => setShowCreate(true)}>
              <Calendar className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          )}
          <Button variant="outline" onClick={() => window.location.href = '/events'}>
            <Calendar className="h-4 w-4 mr-2" />
            View All Events
          </Button>
        </div>
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

      {/* Create Event Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>Fill in the details and publish when ready.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Solana Builders Meetup" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventType">Type</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as Event["eventType"])}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meetup">Meetup</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="hackathon">Hackathon</SelectItem>
                  <SelectItem value="study_group">Study Group</SelectItem>
                  <SelectItem value="1on1">1 on 1</SelectItem>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="networking">Networking</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventDate">Date</Label>
              <Input id="eventDate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start</Label>
                <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End</Label>
                <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="What is this event about?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Obelisk Hub, Accra / Zoom / TBD" />
            </div>
            <div className="space-y-2">
              <Label>Location Type</Label>
              <Select value={locationType} onValueChange={(v) => setLocationType(v as Event["locationType"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Select value={capacityType} onValueChange={(v) => setCapacityType(v as Event["capacityType"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="limited">Limited</SelectItem>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                  <SelectItem value="invite_only">Invite Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxAttendees">Max Attendees</Label>
              <Input id="maxAttendees" type="number" min={1} value={maxAttendees} onChange={(e) => setMaxAttendees(parseInt(e.target.value || "0", 10))} />
            </div>
            <div className="space-y-2">
              <Label>Skill Level</Label>
              <Select value={skillLevel} onValueChange={(v) => setSkillLevel(v as Event["skillLevel"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="xpReward">XP Reward</Label>
              <Input id="xpReward" type="number" min={0} value={xpReward} onChange={(e) => setXpReward(parseInt(e.target.value || "0", 10))} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Public
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost</Label>
              <Input id="cost" type="number" min={0} value={cost} onChange={(e) => setCost(parseFloat(e.target.value || "0"))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateEvent} disabled={creating}>
              {creating ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

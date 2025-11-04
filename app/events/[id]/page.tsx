"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { LoadingButton } from "@/components/ui/loading-button"
import { EnhancedEventEditForm } from "@/components/events/enhanced-event-edit-form"
import { formatRelativeTime } from "@/lib/utils"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  Star, 
  Globe,
  Building,
  ArrowLeft,
  Share2,
  Heart,
  MessageCircle,
  UserPlus,
  UserMinus,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Mail,
  Phone,
  Twitter,
  Linkedin,
  Github,
  Trash2,
  Edit
} from "lucide-react"
import { BannerQRCode } from "@/components/qr/qr-code-generator"
import type { Event, Booking, User } from "@/lib/types"

const EVENT_TYPE_ICONS = {
  marketing: "",
  social: "",
  workshop: "",
  "1on1": "",
  study_group: "",
  hackathon: "",
  meetup: "",
  conference: "",
  networking: "",
} as const

const EVENT_TYPE_COLORS = {
  marketing: "bg-red-100 text-red-800",
  social: "bg-yellow-100 text-yellow-800",
  workshop: "bg-blue-100 text-blue-800",
  "1on1": "bg-green-100 text-green-800",
  study_group: "bg-purple-100 text-purple-800",
  hackathon: "bg-orange-100 text-orange-800",
  meetup: "bg-pink-100 text-pink-800",
  conference: "bg-indigo-100 text-indigo-800",
  networking: "bg-cyan-100 text-cyan-800",
} as const

interface Attendee {
  id: string
  name: string
  avatar?: string
  status: string
  bookedAt: string
  checkedIn: boolean
  checkedInAt?: string
}

export default function EventPage() {
  const params = useParams()
  const { user } = useSession()
  const { execute, loading } = useApi()
  const { toast } = useToast()
  const [event, setEvent] = useState<any>(null)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [booking, setBooking] = useState<Booking | null>(null)
  const [isBooking, setIsBooking] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [cancellingError, setCancellingError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)

  const eventId = params.id as string

  // Check if user can edit the event
  const canEditEvent = useMemo(() => {
    if (!user || !event) return false
    
    // User is the creator
    if (user.id === event.creatorId) return true
    
    // User is a team member of an organizing team
    return event.organizers?.some((org: any) => 
      org.organizerType === "team" && 
      org.team && 
      org.team.members?.some((member: any) => 
        member.user_id === user.id && member.is_active
      )
    ) || false
  }, [user, event])

  const loadEvent = useCallback(async () => {
    if (!eventId) {
      setLoadingEvent(false)
      return
    }

    try {
      setLoadingEvent(true)
      setEvent(null) // Reset event state
      
      // Single API call to get event data
      const eventResult = await execute(`/api/events/${eventId}`)
      
      if (eventResult.success && eventResult.data) {
        setEvent(eventResult.data)
        setLoadingEvent(false) // Set loading to false immediately after main data loads
        
        // Load additional data in background (non-blocking)
        setTimeout(() => {
          Promise.allSettled([
            execute(`/api/events/${eventId}/attendees`, {
              headers: {
                "x-user-id": user?.id || "",
              },
            }),
            user ? execute(`/api/events/bookings`, {
              headers: {
                "x-user-id": user.id,
              },
            }) : Promise.resolve({ success: false, data: [] })
          ]).then(([attendeesResult, bookingResult]) => {
            if (attendeesResult.status === 'fulfilled' && attendeesResult.value.success) {
              setAttendees(attendeesResult.value.data.attendees || [])
            }
            
            if (bookingResult.status === 'fulfilled' && bookingResult.value.success) {
              const userBooking = bookingResult.value.data.find((b: any) => b.eventId === eventId)
              setBooking(userBooking || null)
            }
          }).catch(error => {
            console.error("Error loading additional data:", error)
            // Don't show toast for background loading errors
          })
        }, 100) // Small delay to ensure main content loads first
      } else {
        setLoadingEvent(false)
        toast({
          title: "Error",
          description: eventResult.error || "Event not found",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading event:", error)
      setLoadingEvent(false)
      toast({
        title: "Error",
        description: "Failed to load event",
        variant: "destructive",
      })
    }
  }, [eventId, user?.id, execute, toast])

  useEffect(() => {
    if (eventId) {
      // Add a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        if (loadingEvent) {
          setLoadingEvent(false)
          toast({
            title: "Loading Timeout",
            description: "Event is taking too long to load. Please try again.",
            variant: "destructive",
          })
        }
      }, 10000) // 10 second timeout

      loadEvent()
      
      return () => clearTimeout(timeoutId)
    }
  }, [eventId, user?.id]) // Removed loadEvent, loadingEvent, toast from dependencies


  const handleBook = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to book events",
        variant: "destructive",
      })
      return
    }

    setIsBooking(true)
    setBookingError(null)
    try {
      const result = await execute(`/api/events/${eventId}/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({}),
      })

      if (result.success) {
        setBooking(result.data)
        toast({
          title: result.data.status === "waitlisted" ? "Added to Waitlist" : "Event Booked",
          description: result.data.status === "waitlisted" 
            ? `You're #${result.data.waitlistPosition} on the waitlist`
            : "You've successfully booked this event!",
        })
        loadEvent() // Refresh event data
      } else {
        setBookingError(result.error || "Failed to book event")
      }
    } catch (error) {
      console.error("Error booking event:", error)
      setBookingError("An error occurred while booking the event")
    } finally {
      setIsBooking(false)
    }
  }, [user, eventId, execute, toast])

  const handleCancel = useCallback(async () => {
    if (!user) return

    setIsCancelling(true)
    setCancellingError(null)
    
    try {
      const result = await execute(`/api/events/${eventId}/book`, {
        method: "DELETE",
        headers: {
          "x-user-id": user.id,
        },
      })

      if (result.success) {
        setBooking(null)
        loadEvent() // Refresh event data
      } else {
        setCancellingError(result.error || "Failed to cancel booking")
      }
    } catch (error) {
      console.error("Error cancelling booking:", error)
      setCancellingError("An error occurred while cancelling the booking")
    } finally {
      setIsCancelling(false)
    }
  }, [user, eventId, execute, toast])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title,
          text: event?.description,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link Copied",
        description: "Event link copied to clipboard",
      })
    }
  }, [event, toast])

  const handleDelete = useCallback(async () => {
    if (!user || !event) return

    const confirmed = window.confirm("Are you sure you want to delete this event? This action cannot be undone.")
    if (!confirmed) return

    setIsDeleting(true)
    try {
      const result = await execute(`/api/events/${event.id}/delete`, {
        method: "DELETE",
        headers: {
          "x-user-id": user.id,
        },
      })

      if (result.success) {
        toast({
          title: "Success",
          description: "Event deleted successfully",
        })
        // Redirect to events page
        window.location.href = "/events"
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete event",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }, [user, event, execute, toast])

  const handleEventUpdated = useCallback((updatedEvent: Event) => {
    setEvent(updatedEvent)
    toast({
      title: "Success",
      description: "Event updated successfully!",
    })
  }, [toast])

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero Section Skeleton */}
        <div className="h-64 md:h-80 bg-muted animate-pulse"></div>
        
        <div className="container max-w-4xl mx-auto py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Skeleton */}
            <div className="lg:col-span-2 space-y-6">
              <div className="animate-pulse">
                <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            </div>
            
            {/* Sidebar Skeleton */}
            <div className="space-y-6">
              <div className="animate-pulse">
                <div className="h-32 bg-muted rounded"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-24 bg-muted rounded"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!event && !loadingEvent) {
    return (
      <div className="container max-w-4xl mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <p className="text-muted-foreground mb-4">The event you're looking for doesn't exist or has been removed.</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/events"}>
              Browse Events
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const isBooked = !!booking
  const isWaitlisted = booking?.status === "waitlisted"
  const isConfirmed = booking?.status === "confirmed"
  const canBook = event.status === "published" && 
    (event.capacityType === "unlimited" || (event.currentAttendeesCount || 0) < event.maxAttendees) &&
    !isBooked
  const canCancel = isBooked && (isConfirmed || isWaitlisted)

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative">
        {event.bannerImage ? (
          <div 
            className="h-64 md:h-80 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${event.bannerImage})` }}
          >
            <div className="absolute inset-0 bg-black/40"></div>
          </div>
        ) : (
          <div className="h-64 md:h-80 bg-gradient-to-r from-blue-600 to-purple-600"></div>
        )}
        
        <div className="absolute inset-0 flex items-end">
          <div className="container max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.history.back()}
                  className="bg-white/90 hover:bg-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="bg-white/90 hover:bg-white"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>

                {user && canEditEvent && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditForm(true)}
                      className="bg-blue-600/90 hover:bg-blue-700 text-white border-blue-600"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-red-600/90 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  </>
                )}
              </div>
              
              {/* QR Code for Magazine Raffle */}
              <BannerQRCode 
                url="https://www.web3recap.io/promo/magazine-raffle"
                size={100}
                className="hidden md:block"
              />
            </div>
            
            <div className="flex items-start gap-4">
              {event.logoImage ? (
                <img 
                  src={event.logoImage} 
                  alt={event.title}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : EVENT_TYPE_ICONS[event.eventType as keyof typeof EVENT_TYPE_ICONS] ? (
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
                  {EVENT_TYPE_ICONS[event.eventType as keyof typeof EVENT_TYPE_ICONS]}
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                </div>
              )}
              
              <div className="flex-1 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`${EVENT_TYPE_COLORS[event.eventType as keyof typeof EVENT_TYPE_COLORS] || 'bg-gray-100 text-gray-800'} text-xs`}>
                    {event.eventType.replace("_", " ").toUpperCase()}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {event.skillLevel}
                  </Badge>
                  {event.isFeatured && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-500 text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{event.title}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Description */}
      {event.description && (
        <div className="bg-background border-b">
          <div className="container max-w-4xl mx-auto py-8">
            <div className="prose prose-gray max-w-none">
              <div className="text-base leading-relaxed whitespace-pre-wrap">
                {event.description}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container max-w-4xl mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Details */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{new Date(event.eventDate).toLocaleDateString()}</div>
                      <div className="text-sm text-muted-foreground">Event Date</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{event.startTime} - {event.endTime}</div>
                      <div className="text-sm text-muted-foreground">Time</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {event.locationType === "online" ? (
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="font-medium">{event.location}</div>
                      <div className="text-sm text-muted-foreground">
                        {event.locationType === "online" ? "Online Event" : "Physical Location"}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {event.currentAttendeesCount || 0}/{event.capacityType === "unlimited" ? "∞" : event.maxAttendees}
                      </div>
                      <div className="text-sm text-muted-foreground">Attendees</div>
                    </div>
                  </div>
                </div>

                {event.cost > 0 && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{event.cost} {event.currency}</div>
                      <div className="text-sm text-muted-foreground">Cost</div>
                    </div>
                  </div>
                )}

                {event.tags && event.tags.length > 0 && (
                  <div>
                    <div className="font-medium mb-2">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Event Description */}
            {event.description && (
              <Card>
                <CardHeader>
                  <CardTitle>About This Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-gray max-w-none">
                    <div className="text-base leading-relaxed whitespace-pre-wrap">
                      {event.description}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Requirements & Materials */}
            {((event.requirements?.length || 0) > 0 || (event.prerequisites?.length || 0) > 0 || (event.learningObjectives?.length || 0) > 0 || (event.materials?.length || 0) > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>Requirements & Materials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {event.requirements && event.requirements.length > 0 && (
                    <div>
                      <div className="font-medium mb-2">Requirements</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {event.requirements.map((req: string, index: number) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {event.prerequisites && event.prerequisites.length > 0 && (
                    <div>
                      <div className="font-medium mb-2">Prerequisites</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {event.prerequisites.map((prereq: string, index: number) => (
                          <li key={index}>{prereq}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {event.learningObjectives && event.learningObjectives.length > 0 && (
                    <div>
                      <div className="font-medium mb-2">Learning Objectives</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {event.learningObjectives.map((objective: string, index: number) => (
                          <li key={index}>{objective}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {event.materials && event.materials.length > 0 && (
                    <div>
                      <div className="font-medium mb-2">Materials to Bring</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {event.materials.map((material: string, index: number) => (
                          <li key={index}>{material}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <Card>
              <CardHeader>
                <CardTitle>Join This Event</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isBooked ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {isWaitlisted ? (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      <span className="font-medium">
                        {isWaitlisted ? `Waitlisted #${booking?.waitlistPosition}` : "Confirmed"}
                      </span>
                    </div>
                    <LoadingButton 
                      variant="destructive" 
                      onClick={handleCancel} 
                      loading={isCancelling}
                      loadingText="Cancelling..."
                      error={cancellingError}
                      onRetry={() => setCancellingError(null)}
                      className="w-full"
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Cancel Attending
                    </LoadingButton>
                  </div>
                ) : canBook ? (
                  <LoadingButton 
                    onClick={handleBook} 
                    loading={isBooking}
                    loadingText="Booking..."
                    error={bookingError}
                    onRetry={() => setBookingError(null)}
                    className="w-full"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Book Event
                  </LoadingButton>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <p>Event is full or not available for booking</p>
                  </div>
                )}

                {event.externalUrl && (
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(event.externalUrl, "_blank")}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    External Link
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Organizer */}
            {/* Event Organizers */}
            <Card>
              <CardHeader>
                <CardTitle>Organizers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Event Creator */}
                {event.creator && (
                  <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={event.creator.avatarUrl} />
                      <AvatarFallback>
                        {event.creator.displayName?.charAt(0).toUpperCase() || "O"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{event.creator.displayName || "Event Creator"}</div>
                      <div className="text-sm text-muted-foreground">
                        Event Creator
                      </div>
                    </div>
                    <Badge variant="secondary">Primary</Badge>
                  </div>
                )}

                {/* Co-Organizers */}
                {event.organizers && event.organizers.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Co-Organizers</div>
                    {event.organizers.map((org: any) => (
                      <div key={org.id} className="flex items-center gap-3 p-2 border rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={org.organizerType === "team" ? org.team?.avatarUrl : org.user?.avatarUrl} 
                          />
                          <AvatarFallback>
                            {org.organizerType === "team" 
                              ? org.team?.name?.charAt(0).toUpperCase() || "T"
                              : org.user?.displayName?.charAt(0).toUpperCase() || "U"
                            }
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-medium">
                          {org.organizerType === "team" 
                            ? org.team?.name || "Unknown Team"
                            : org.user?.displayName || "Unknown User"
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(!event.organizers || event.organizers.length === 0) && (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    No co-organizers added yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            {event.contactPhone && (
              <Card>
                <CardHeader>
                  <CardTitle>Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`tel:${event.contactPhone}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {event.contactPhone}
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attendees */}
            <Card>
              <CardHeader>
                <CardTitle>Attendees ({attendees.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {attendees.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No attendees yet</p>
                ) : (
                  <div className="space-y-3">
                    {attendees.slice(0, 8).map((attendee) => (
                      <div key={attendee.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={attendee.avatar} />
                          <AvatarFallback>
                            {attendee.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{attendee.name}</div>
                          <div className="flex items-center gap-1">
                            {attendee.checkedIn ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : attendee.status === "waitlisted" ? (
                              <AlertCircle className="h-3 w-3 text-yellow-500" />
                            ) : (
                              <div className="h-3 w-3 rounded-full bg-gray-300"></div>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {attendee.status === "waitlisted" ? "Waitlisted" : 
                               attendee.checkedIn ? "Checked In" : "Confirmed"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {attendees.length > 8 && (
                      <div className="text-center text-sm text-muted-foreground pt-2">
                        +{attendees.length - 8} more
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Event Form */}
      <EnhancedEventEditForm
        open={showEditForm}
        onOpenChange={setShowEditForm}
        event={event}
        onEventUpdated={handleEventUpdated}
      />
    </div>
  )
}

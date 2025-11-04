"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  ExternalLink,
  BookOpen,
  Target,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
  UserMinus,
  Globe,
  Building,
  Trash2,
  MoreVertical
} from "lucide-react"
import type { Event, Booking, User } from "@/lib/types"

interface EnhancedEventCardProps {
  event: Event
  booking?: Booking
  organizer?: User
  onBookingChange?: (eventId: string, booking: Booking | null) => void
  onDelete?: (eventId: string) => void
}

const EVENT_TYPE_ICONS = {
  workshop: "🔧",
  "1on1": "👤",
  study_group: "📚",
  hackathon: "💻",
  meetup: "🤝",
  conference: "🎤",
  networking: "🌐",
  social: "🎉",
  marketing: "📢",
} as const

const EVENT_TYPE_COLORS = {
  workshop: "bg-blue-100 text-blue-800",
  "1on1": "bg-green-100 text-green-800",
  study_group: "bg-purple-100 text-purple-800",
  hackathon: "bg-orange-100 text-orange-800",
  meetup: "bg-pink-100 text-pink-800",
  conference: "bg-indigo-100 text-indigo-800",
  networking: "bg-cyan-100 text-cyan-800",
  social: "bg-emerald-100 text-emerald-800",
  marketing: "bg-rose-100 text-rose-800",
} as const

const SKILL_LEVEL_COLORS = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-yellow-100 text-yellow-800",
  advanced: "bg-red-100 text-red-800",
  all: "bg-gray-100 text-gray-800",
} as const

export function EnhancedEventCard({ event, booking, organizer, onBookingChange, onDelete }: EnhancedEventCardProps) {
  const { user } = useSession()
  const { execute, loading } = useApi()
  const { toast } = useToast()
  const [showDetails, setShowDetails] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isBooked = !!booking
  const isWaitlisted = booking?.status === "waitlisted"
  const isConfirmed = booking?.status === "confirmed"
  const isCancelled = booking?.status === "cancelled"
  const isAttended = booking?.status === "attended"

  const canBook = event.status === "published" && 
    (event.capacityType === "unlimited" || event.currentAttendeesCount < event.maxAttendees) &&
    !isBooked

  const canCancel = isBooked && (isConfirmed || isWaitlisted)

  const handleBook = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to book events",
        variant: "destructive",
      })
      return
    }

    setIsBooking(true)
    try {
      const result = await execute(`/api/events/${event.id}/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({}),
      })

      if (result.success) {
        onBookingChange?.(event.id, result.data)
        toast({
          title: isWaitlisted ? "Added to Waitlist" : "Event Booked",
          description: isWaitlisted 
            ? `You're #${result.data.waitlistPosition} on the waitlist`
            : "You've successfully booked this event!",
        })
      } else {
        toast({
          title: "Booking Failed",
          description: result.error || "Failed to book event",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error booking event:", error)
      toast({
        title: "Error",
        description: "Failed to book event",
        variant: "destructive",
      })
    } finally {
      setIsBooking(false)
    }
  }

  const handleCancel = async () => {
    if (!user) return

    setIsBooking(true)
    try {
      const result = await execute(`/api/events/${event.id}/book`, {
        method: "DELETE",
        headers: {
          "x-user-id": user.id,
        },
      })

      if (result.success) {
        onBookingChange?.(event.id, null)
        toast({
          title: "Booking Cancelled",
          description: "Your booking has been cancelled",
        })
      } else {
        toast({
          title: "Cancellation Failed",
          description: result.error || "Failed to cancel booking",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error cancelling booking:", error)
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      })
    } finally {
      setIsBooking(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !onDelete) return

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
        onDelete(event.id)
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
  }

  const getLocationIcon = () => {
    if (event.location?.toLowerCase().includes("online") || event.location?.toLowerCase().includes("zoom")) {
      return <Globe className="h-4 w-4" />
    }
    return <MapPin className="h-4 w-4" />
  }

  const getBookingStatusIcon = () => {
    if (isAttended) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (isConfirmed) return <CheckCircle className="h-4 w-4 text-blue-500" />
    if (isWaitlisted) return <AlertCircle className="h-4 w-4 text-yellow-500" />
    if (isCancelled) return <XCircle className="h-4 w-4 text-red-500" />
    return null
  }

  const getBookingStatusText = () => {
    if (isAttended) return "Attended"
    if (isConfirmed) return "Confirmed"
    if (isWaitlisted) return `Waitlisted #${booking?.waitlistPosition}`
    if (isCancelled) return "Cancelled"
    return ""
  }

  return (
    <>
      <Card 
        className="hover:shadow-lg transition-shadow duration-200 overflow-hidden cursor-pointer"
        onClick={() => window.location.href = `/events/${event.id}`}
      >
        {/* Cover Image */}
        {event.coverImage && (
          <div className="h-32 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${event.coverImage})` }}>
            <div className="h-full bg-black/20"></div>
          </div>
        )}
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {event.logoImage ? (
                  <img 
                    src={event.logoImage} 
                    alt={event.title}
                    className="w-6 h-6 rounded object-cover"
                  />
                ) : EVENT_TYPE_ICONS[event.eventType] ? (
                  <span className="text-2xl">{EVENT_TYPE_ICONS[event.eventType]}</span>
                ) : null}
                <Badge className={EVENT_TYPE_COLORS[event.eventType] || 'bg-gray-500'}>
                  {event.eventType?.replace("_", " ")?.toUpperCase() || 'EVENT'}
                </Badge>
                <Badge className={SKILL_LEVEL_COLORS[event.skillLevel] || 'bg-gray-500'}>
                  {event.skillLevel?.toUpperCase() || 'ALL'}
                </Badge>
                {event.isFeatured && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                    <Star className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>
              <h3 className="text-lg font-semibold mb-2 line-clamp-2">{event.title}</h3>
              {event.description && (
                <p className="text-muted-foreground text-sm line-clamp-2">{event.description}</p>
              )}
            </div>
            {organizer && (
              <div className="flex items-center gap-2 ml-4">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={organizer.avatarUrl} />
                  <AvatarFallback>
                    {organizer.displayName?.charAt(0).toUpperCase() || "O"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <div className="font-medium">{organizer.displayName || "Organizer"}</div>
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{new Date(event.eventDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{event.startTime} - {event.endTime}</span>
            </div>
            <div className="flex items-center gap-2">
              {getLocationIcon()}
              <span className="truncate">{event.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {event.currentAttendeesCount}/{event.capacityType === "unlimited" ? "∞" : event.maxAttendees}
                {event.waitlistCount > 0 && ` (+${event.waitlistCount} waitlist)`}
              </span>
            </div>
          </div>

          {event.cost > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>{event.cost} {event.currency}</span>
            </div>
          )}

          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {event.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{event.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {isBooked && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              {getBookingStatusIcon()}
              <span className="text-sm font-medium">{getBookingStatusText()}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                window.location.href = `/events/${event.id}`
              }}
              className="flex-1"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              View Details
            </Button>
            
            {canBook && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleBook()
                }}
                disabled={isBooking}
                className="flex-1"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {isBooking ? "Booking..." : "Book Event"}
              </Button>
            )}

            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCancel()
                }}
                disabled={isBooking}
                className="flex-1"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                {isBooking ? "Cancelling..." : "Cancel"}
              </Button>
            )}

            {event.externalUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(event.externalUrl, "_blank")
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}

            {user && user.id === event.creatorId && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : ""}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{EVENT_TYPE_ICONS[event.eventType]}</span>
              {event.title}
            </DialogTitle>
            <DialogDescription>
              Event details and information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {event.description && (
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-muted-foreground">{event.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Date & Time</h4>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{event.startTime} - {event.endTime}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Location</h4>
                <div className="flex items-center gap-2 text-sm">
                  {getLocationIcon()}
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {event.currentAttendeesCount}/{event.capacityType === "unlimited" ? "∞" : event.maxAttendees} attendees
                  </span>
                </div>
              </div>
            </div>

            {event.requirements && event.requirements.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Requirements
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {event.requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {event.prerequisites && event.prerequisites.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Prerequisites</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {event.prerequisites.map((prereq, index) => (
                    <li key={index}>{prereq}</li>
                  ))}
                </ul>
              </div>
            )}

            {event.learningObjectives && event.learningObjectives.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Learning Objectives</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {event.learningObjectives.map((objective, index) => (
                    <li key={index}>{objective}</li>
                  ))}
                </ul>
              </div>
            )}

            {event.materials && event.materials.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Materials to Bring
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {event.materials.map((material, index) => (
                    <li key={index}>{material}</li>
                  ))}
                </ul>
              </div>
            )}

            {event.materialsProvided && event.materialsProvided.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Materials Provided</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {event.materialsProvided.map((material, index) => (
                    <li key={index}>{material}</li>
                  ))}
                </ul>
              </div>
            )}

            {event.tags && event.tags.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {event.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {event.contactPhone && (
              <div>
                <h4 className="font-semibold mb-2">Contact Information</h4>
                <div className="space-y-1 text-sm">
                  <div>Phone: {event.contactPhone}</div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {canBook && (
                <Button onClick={handleBook} disabled={isBooking} className="flex-1">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isBooking ? "Booking..." : "Book Event"}
                </Button>
              )}

              {canCancel && (
                <Button variant="destructive" onClick={handleCancel} disabled={isBooking} className="flex-1">
                  <UserMinus className="h-4 w-4 mr-2" />
                  {isBooking ? "Cancelling..." : "Cancel Booking"}
                </Button>
              )}

              {event.externalUrl && (
                <Button variant="outline" onClick={() => window.open(event.externalUrl, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  External Link
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

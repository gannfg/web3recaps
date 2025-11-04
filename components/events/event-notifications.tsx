"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { formatRelativeTime } from "@/lib/utils"
import { 
  Mail, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  Calendar,
  AlertCircle,
  Bell
} from "lucide-react"
import type { Event } from "@/lib/types"

interface EventNotificationsProps {
  event: Event
  onClose?: () => void
}

interface NotificationHistory {
  id: string
  type: string
  title: string
  message: string
  data: any
  created_at: string
}

const NOTIFICATION_TYPES = [
  { value: 'reminder', label: 'Event Reminder', description: 'Remind attendees about upcoming event' },
  { value: 'confirmation', label: 'Registration Confirmation', description: 'Confirm successful registration' },
  { value: 'waitlist', label: 'Waitlist Notification', description: 'Notify about waitlist position' },
  { value: 'cancelled', label: 'Event Cancelled', description: 'Notify about event cancellation' },
  { value: 'checkin', label: 'Check-in Code', description: 'Send check-in code to attendees' },
]

export function EventNotifications({ event, onClose }: EventNotificationsProps) {
  const { execute, loading } = useApi()
  const { toast } = useToast()
  const [selectedType, setSelectedType] = useState('reminder')
  const [recipients, setRecipients] = useState<'all' | 'confirmed' | 'waitlisted'>('all')
  const [isSending, setIsSending] = useState(false)
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const loadNotificationHistory = async () => {
    try {
      const result = await execute(`/api/notifications/events?eventId=${event.id}`)
      if (result.success) {
        setNotificationHistory(result.data || [])
      }
    } catch (error) {
      console.error('Error loading notification history:', error)
    }
  }

  useEffect(() => {
    loadNotificationHistory()
  }, [event.id])

  const handleSendNotification = async () => {
    if (!selectedType) return

    setIsSending(true)
    try {
      const result = await execute('/api/notifications/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: selectedType,
          eventId: event.id,
          sendToAll: recipients === 'all',
        }),
      })

      if (result.success) {
        toast({
          title: "Notification Sent",
          description: `Sent ${result.data.sent} notifications successfully`,
        })
        loadNotificationHistory()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send notification",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'reminder': return <Clock className="h-4 w-4" />
      case 'confirmation': return <CheckCircle className="h-4 w-4" />
      case 'waitlist': return <AlertCircle className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      case 'checkin': return <Bell className="h-4 w-4" />
      default: return <Mail className="h-4 w-4" />
    }
  }

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'reminder': return 'bg-blue-100 text-blue-800'
      case 'confirmation': return 'bg-green-100 text-green-800'
      case 'waitlist': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'checkin': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const selectedNotificationType = NOTIFICATION_TYPES.find(t => t.value === selectedType)

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Event Notifications
          </DialogTitle>
          <DialogDescription>
            Send notifications to attendees for "{event.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {new Date(event.eventDate).toLocaleDateString()} at {event.startTime}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {event.currentAttendeesCount} attendees
                  {event.waitlistCount > 0 && `, ${event.waitlistCount} on waitlist`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Send Notification */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Send Notification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Notification Type</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          {getNotificationTypeIcon(type.value)}
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedNotificationType && (
                  <p className="text-sm text-muted-foreground">
                    {selectedNotificationType.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Recipients</label>
                <Select value={recipients} onValueChange={(value: any) => setRecipients(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Attendees ({event.currentAttendeesCount + event.waitlistCount})</SelectItem>
                    <SelectItem value="confirmed">Confirmed Only ({event.currentAttendeesCount})</SelectItem>
                    <SelectItem value="waitlisted">Waitlisted Only ({event.waitlistCount})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleSendNotification} 
                disabled={isSending || !selectedType}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSending ? 'Sending...' : 'Send Notification'}
              </Button>
            </CardContent>
          </Card>

          {/* Notification History */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Notification History</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? 'Hide' : 'Show'} History
                </Button>
              </div>
            </CardHeader>
            {showHistory && (
              <CardContent>
                {notificationHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No notifications sent yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notificationHistory.map((notification) => (
                      <div key={notification.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0">
                          {getNotificationTypeIcon(notification.type.replace('event_', ''))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{notification.title}</span>
                            <Badge className={getNotificationTypeColor(notification.type.replace('event_', ''))}>
                              {notification.type.replace('event_', '')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{formatRelativeTime(notification.created_at)}</span>
                            {notification.data?.success_count && (
                              <span className="text-green-600">
                                {notification.data.success_count} sent
                              </span>
                            )}
                            {notification.data?.failed_count && notification.data.failed_count > 0 && (
                              <span className="text-red-600">
                                {notification.data.failed_count} failed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

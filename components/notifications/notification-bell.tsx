"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { formatRelativeTime } from "@/lib/utils"
import { Bell, Check, X } from "lucide-react"
import type { Notification } from "@/lib/types"

const NOTIFICATION_ICONS: Record<string, string> = {
  post_like: "❤️",
  post_comment: "💬",
  event_reminder: "📅",
  team_invite: "👥",
  achievement: "🏆",
  system: "🔔",
}

export function NotificationBell() {
  const { user } = useSession()
  const { execute } = useApi()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (user) {
      loadNotifications()
    }
  }, [user])

  const loadNotifications = async () => {
    if (!user) return

    setLoading(true)
    const result = await execute("/api/notifications", {
      headers: {
        "x-user-id": user.id,
      },
    })

    if (result.success && result.data) {
      setNotifications(result.data.notifications)
      setUnreadCount(result.data.unreadCount)
    }
    setLoading(false)
  }

  const markAsRead = async (notificationId: string) => {
    if (!user) return

    const result = await execute(`/api/notifications/${notificationId}/read`, {
      method: "PUT",
      headers: {
        "x-user-id": user.id,
      },
    })

    if (result.success) {
      setNotifications(notifications.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif)))
      setUnreadCount(Math.max(0, unreadCount - 1))
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    const result = await execute("/api/notifications/read-all", {
      method: "PUT",
      headers: {
        "x-user-id": user.id,
      },
    })

    if (result.success) {
      setNotifications(notifications.map((notif) => ({ ...notif, read: true })))
      setUnreadCount(0)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (!user) return

    const result = await execute(`/api/notifications/${notificationId}`, {
      method: "DELETE",
      headers: {
        "x-user-id": user.id,
      },
    })

    if (result.success) {
      const deletedNotif = notifications.find((n) => n.id === notificationId)
      setNotifications(notifications.filter((notif) => notif.id !== notificationId))
      if (deletedNotif && !deletedNotif.readAt) {
        setUnreadCount(Math.max(0, unreadCount - 1))
      }
    }
  }

  if (!user) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No notifications yet</div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-muted/50 border-b last:border-b-0 ${
                    !notification.readAt ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{NOTIFICATION_ICONS[notification.type] || "🔔"}</span>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(notification.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.readAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

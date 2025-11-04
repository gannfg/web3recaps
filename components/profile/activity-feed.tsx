"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Trophy, Users, MessageSquare, Heart } from "lucide-react"

interface Activity {
  id: string
  type: "post" | "comment" | "event" | "achievement" | "team_join"
  title: string
  description: string
  timestamp: string
  xpGained?: number
}

interface ActivityFeedProps {
  activities: Activity[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "post":
        return <MessageSquare className="h-4 w-4" />
      case "comment":
        return <Heart className="h-4 w-4" />
      case "event":
        return <Calendar className="h-4 w-4" />
      case "achievement":
        return <Trophy className="h-4 w-4" />
      case "team_join":
        return <Users className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "post":
        return "text-blue-500"
      case "comment":
        return "text-pink-500"
      case "event":
        return "text-green-500"
      case "achievement":
        return "text-yellow-500"
      case "team_join":
        return "text-purple-500"
      default:
        return "text-gray-500"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent activity to show.</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex gap-3 p-3 rounded-lg border">
                <div className={`mt-1 ${getActivityColor(activity.type)}`}>{getActivityIcon(activity.type)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{activity.title}</h4>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    </div>
                    {activity.xpGained && (
                      <Badge variant="secondary" className="text-xs">
                        +{activity.xpGained} XP
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { StatCard } from "@/components/common/stat-card"
import { useApi } from "@/hooks/use-api"
import { Users, MessageSquare, Calendar, Trophy, TrendingUp, Activity } from "lucide-react"

interface AdminStats {
  totalUsers: number
  totalPosts: number
  totalEvents: number
  totalTeams: number
  activeUsers: number
  totalXpAwarded: number
  userGrowth: number
  engagementRate: number
}

export function AdminStatsDashboard() {
  const { execute } = useApi()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      const result = await execute("/api/admin/stats")
      if (result.success && result.data) {
        setStats(result.data as AdminStats)
      }
      setLoading(false)
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Failed to load admin statistics</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Users"
        value={stats.totalUsers}
        icon={Users}
        trend={{
          value: stats.userGrowth,
          label: "vs last month"
        }}
      />
      <StatCard title="Total Posts" value={stats.totalPosts} icon={MessageSquare} description="Community posts" />
      <StatCard title="Total Events" value={stats.totalEvents} icon={Calendar} description="Events created" />
      <StatCard title="Total Teams" value={stats.totalTeams} icon={Users} description="Teams formed" />
      <StatCard title="Active Users" value={stats.activeUsers} icon={Activity} description="Last 30 days" />
      <StatCard title="XP Awarded" value={stats.totalXpAwarded} icon={Trophy} description="Total experience points" />
      <StatCard
        title="Engagement Rate"
        value={`${stats.engagementRate}%`}
        icon={TrendingUp}
        description="User engagement"
      />
      <StatCard
        title="Growth Rate"
        value={`${stats.userGrowth}%`}
        icon={TrendingUp}
        trend={{
          value: stats.userGrowth,
          label: "vs last month"
        }}
        description="Monthly growth"
      />
    </div>
  )
}

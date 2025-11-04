import { NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 })
    }

    // Fetch all users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, role, created_at, last_seen, total_xp")

    if (usersError) {
      console.error("Error fetching users:", usersError)
      return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 })
    }

    // Fetch posts count
    const { count: postsCount, error: postsError } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })

    if (postsError) {
      console.error("Error fetching posts count:", postsError)
    }

    // Fetch events count
    const { count: eventsCount, error: eventsError } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })

    if (eventsError) {
      console.error("Error fetching events count:", eventsError)
    }

    // Fetch teams count
    const { count: teamsCount, error: teamsError } = await supabase
      .from("teams")
      .select("*", { count: "exact", head: true })

    if (teamsError) {
      console.error("Error fetching teams count:", teamsError)
    }

    // Calculate active users (users with activity in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const activeUsers = users.filter((user) => {
      const lastActivity = new Date(user.last_seen || user.created_at)
      return lastActivity > thirtyDaysAgo
    }).length

    // Calculate user growth (comparing last 30 days to previous 30 days)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const usersLast30Days = users.filter((user) => {
      const createdAt = new Date(user.created_at)
      return createdAt > thirtyDaysAgo
    }).length

    const usersPrevious30Days = users.filter((user) => {
      const createdAt = new Date(user.created_at)
      return createdAt > sixtyDaysAgo && createdAt <= thirtyDaysAgo
    }).length

    const userGrowth =
      usersPrevious30Days > 0 ? ((usersLast30Days - usersPrevious30Days) / usersPrevious30Days) * 100 : 0

    // Calculate total XP across all users
    const totalXpAwarded = users.reduce((sum, user) => sum + (user.total_xp || 0), 0)

    // Calculate role distribution
    const roleDistribution = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const stats = {
      totalUsers: users.length,
      totalPosts: postsCount || 0,
      totalEvents: eventsCount || 0,
      totalTeams: teamsCount || 0,
      activeUsers,
      totalXpAwarded,
      userGrowth: Math.round(userGrowth * 100) / 100,
      roleDistribution,
    }

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch admin stats" }, { status: 500 })
  }
}

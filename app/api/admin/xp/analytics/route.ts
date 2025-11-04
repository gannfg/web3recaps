import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    // Check if user is admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError || !user || (user.role !== 'Admin' && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 1. Total XP distributed
    const { data: totalXpData, error: totalXpError } = await supabase
      .from('xp_transactions')
      .select('xp_earned')
      .gte('timestamp', startDate.toISOString())

    const totalXpDistributed = totalXpData?.reduce((sum, tx) => sum + (tx.xp_earned || 0), 0) || 0

    // 2. Average XP per user
    const { data: avgXpData, error: avgXpError } = await supabase
      .from('users')
      .select('total_xp')
      .not('total_xp', 'is', null)

    const avgXpPerUser = avgXpData && avgXpData.length > 0 
      ? avgXpData.reduce((sum, user) => sum + (user.total_xp || 0), 0) / avgXpData.length 
      : 0

    // 3. XP by activity type
    const { data: activityData, error: activityError } = await supabase
      .from('xp_transactions')
      .select('activity, xp_earned')
      .gte('timestamp', startDate.toISOString())

    const xpByActivity: Record<string, number> = activityData?.reduce((acc, tx) => {
      const activity = tx.activity || 'unknown'
      acc[activity] = (acc[activity] || 0) + (tx.xp_earned || 0)
      return acc
    }, {} as Record<string, number>) || {}

    // 4. Daily XP trends
    const { data: dailyTrendsData, error: dailyTrendsError } = await supabase
      .from('xp_transactions')
      .select('timestamp, xp_earned')
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true })

    const dailyTrends: Record<string, number> = dailyTrendsData?.reduce((acc, tx) => {
      const date = new Date(tx.timestamp).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + (tx.xp_earned || 0)
      return acc
    }, {} as Record<string, number>) || {}

    // 5. Top XP earners
    const { data: topEarnersData, error: topEarnersError } = await supabase
      .from('users')
      .select('id, display_name, total_xp, rank, level, avatar_url')
      .not('total_xp', 'is', null)
      .order('total_xp', { ascending: false })
      .limit(10)

    // 6. Badge unlock rates
    const { data: badgeData, error: badgeError } = await supabase
      .from('user_badges')
      .select('badge_id, earned_at')
      .gte('earned_at', startDate.toISOString())

    const badgeUnlockCount = badgeData?.length || 0
    const totalUsers = avgXpData?.length || 0
    const badgeUnlockRate = totalUsers > 0 ? (badgeUnlockCount / totalUsers) * 100 : 0

    // 7. Rank distribution
    const { data: rankData, error: rankError } = await supabase
      .from('users')
      .select('rank')
      .not('rank', 'is', null)

    const rankDistribution = rankData?.reduce((acc, user) => {
      const rank = user.rank || 'Unknown'
      acc[rank] = (acc[rank] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // 8. Recent XP transactions
    const { data: recentTransactions, error: recentError } = await supabase
      .from('xp_transactions')
      .select(`
        id,
        user_id,
        activity,
        xp_earned,
        timestamp,
        details,
        users!xp_transactions_user_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .order('timestamp', { ascending: false })
      .limit(20)

    // 9. Weekly XP trends
    const weeklyTrends: Record<string, number> = {}
    const weeks = Math.ceil(days / 7)
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7)
      const weekEnd = new Date()
      weekEnd.setDate(weekEnd.getDate() - i * 7)
      
      const weekKey = `Week ${weeks - i}`
      weeklyTrends[weekKey] = 0
    }

    // Calculate weekly trends
    dailyTrendsData?.forEach(tx => {
      const txDate = new Date(tx.timestamp)
      const weeksAgo = Math.floor((new Date().getTime() - txDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
      if (weeksAgo < weeks) {
        const weekKey = `Week ${weeks - weeksAgo}`
        weeklyTrends[weekKey] = (weeklyTrends[weekKey] || 0) + (tx.xp_earned || 0)
      }
    })

    // 10. Activity frequency
    const activityFrequency: Record<string, number> = activityData?.reduce((acc, tx) => {
      const activity = tx.activity || 'unknown'
      acc[activity] = (acc[activity] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const analytics = {
      totalXpDistributed,
      avgXpPerUser: Math.round(avgXpPerUser),
      totalUsers,
      xpByActivity,
      dailyTrends,
      weeklyTrends,
      topEarners: topEarnersData?.map(user => ({
        id: user.id,
        displayName: user.display_name,
        totalXp: user.total_xp,
        rank: user.rank,
        level: user.level,
        avatarUrl: user.avatar_url
      })) || [],
      badgeUnlockRate: Math.round(badgeUnlockRate * 100) / 100,
      badgeUnlockCount,
      rankDistribution,
      activityFrequency,
      recentTransactions: recentTransactions?.map(tx => ({
        id: tx.id,
        userId: tx.user_id,
        activity: tx.activity,
        xpEarned: tx.xp_earned,
        timestamp: tx.timestamp,
        details: tx.details,
        user: tx.users ? {
          displayName: (tx.users as any).display_name,
          avatarUrl: (tx.users as any).avatar_url
        } : null
      })) || [],
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error("XP analytics error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch XP analytics" },
      { status: 500 }
    )
  }
}

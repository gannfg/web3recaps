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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 per page
    const from = searchParams.get('from') // ISO date string
    const to = searchParams.get('to') // ISO date string
    const activity = searchParams.get('activity') // Filter by activity type

    // Build query
    let query = supabase
      .from('xp_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })

    // Apply date filters
    if (from) {
      query = query.gte('timestamp', from)
    }
    if (to) {
      query = query.lte('timestamp', to)
    }

    // Apply activity filter
    if (activity) {
      query = query.eq('activity', activity)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: transactions, error, count } = await query

    if (error) {
      console.error("Error fetching XP history:", error)
      return NextResponse.json({ success: false, error: "Failed to fetch XP history" }, { status: 500 })
    }

    // Format transactions
    const formattedTransactions = transactions?.map(tx => ({
      id: tx.id,
      activity: tx.activity,
      xpEarned: tx.xp_earned,
      timestamp: tx.timestamp,
      details: tx.details ? JSON.parse(tx.details) : null
    })) || []

    // Get summary statistics
    const { data: summaryData, error: summaryError } = await supabase
      .from('xp_transactions')
      .select('xp_earned, activity, timestamp')
      .eq('user_id', userId)

    let summary = {
      totalXpEarned: 0,
      totalTransactions: 0,
      xpByActivity: {} as Record<string, number>,
      firstTransaction: null as string | null,
      lastTransaction: null as string | null
    }

    if (!summaryError && summaryData) {
      summary.totalXpEarned = summaryData.reduce((sum, tx) => sum + (tx.xp_earned || 0), 0)
      summary.totalTransactions = summaryData.length
      
      // XP by activity
      summary.xpByActivity = summaryData.reduce((acc, tx) => {
        const activity = tx.activity || 'unknown'
        acc[activity] = (acc[activity] || 0) + (tx.xp_earned || 0)
        return acc
      }, {} as Record<string, number>)

      // First and last transaction dates
      if (summaryData.length > 0) {
        const sortedByDate = summaryData.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        summary.firstTransaction = sortedByDate[0].timestamp
        summary.lastTransaction = sortedByDate[sortedByDate.length - 1].timestamp
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit),
          hasMore: (offset + limit) < (count || 0)
        },
        summary,
        filters: {
          from,
          to,
          activity
        }
      }
    })

  } catch (error) {
    console.error("XP history error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch XP history" },
      { status: 500 }
    )
  }
}

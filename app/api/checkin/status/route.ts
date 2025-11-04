import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { computeStreak } from "@/lib/gamification"
import type { ApiResponse } from "@/lib/types"

const ACCESS_COOKIE = "sb-access-token"
const REFRESH_COOKIE = "sb-refresh-token"

async function getAuthedClient(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value
  const supabase = createSupabaseServer()
  if (!supabase || !access || !refresh) return { supabase: null }
  await supabase.auth.setSession({ access_token: access, refresh_token: refresh })
  return { supabase }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await getAuthedClient(request)
    if (!supabase) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const userId = userRes.user.id

    // Check if user has checked in today
    const today = new Date().toISOString().split("T")[0]
    const { data: todayCheckin } = await supabase
      .from("checkins")
      .select("id")
      .eq("user_id", userId)
      .eq("date", today)
      .single()

    // Compute current streak
    const streak = await computeStreak(userId)

    const response: ApiResponse<{
      canCheckIn: boolean
      streak: number
      todayCheckedIn: boolean
      xpEarned: number
      nextMilestone: number
    }> = {
      success: true,
      data: {
        canCheckIn: !todayCheckin,
        streak,
        todayCheckedIn: !!todayCheckin,
        xpEarned: 10, // Daily XP reward
        nextMilestone: 7, // Next streak milestone
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Get checkin status error:", error)
    return NextResponse.json({ success: false, error: "Failed to get checkin status" }, { status: 500 })
  }
}

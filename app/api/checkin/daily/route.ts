import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { awardXp } from "@/lib/gamification"
import { XP_VALUES } from "@/lib/types"
import { createLevelUpNotification, createRankUpNotification } from "@/lib/notifications"

const ACCESS_COOKIE = "sb-access-token"
const REFRESH_COOKIE = "sb-refresh-token"

async function getAuthedClient(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value
  const supabase = createSupabaseServer()
  if (!supabase || !access || !refresh) return { supabase: null }
  // Set session so client acts on behalf of user
  await supabase.auth.setSession({ access_token: access, refresh_token: refresh })
  return { supabase }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await getAuthedClient(request)
    if (!supabase) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const userId = userRes.user.id

    const body = await request.json()
    const { walletAddress } = body

    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "Wallet address required" }, { status: 400 })
    }

    // Check if user has already checked in today
    const today = new Date().toISOString().split("T")[0]
    
    const { data: existingCheckin } = await supabase
      .from("checkins")
      .select("id")
      .eq("user_id", userId)
      .eq("date", today)
      .single()

    if (existingCheckin) {
      return NextResponse.json({ success: false, error: "Already checked in today" }, { status: 400 })
    }

    // Create check-in record
    const { data: checkin, error: checkinError } = await supabase
      .from("checkins")
      .insert({
        user_id: userId,
        date: today,
        wallet_address: walletAddress,
        location: "daily-checkin",
        checked_in_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (checkinError) {
      return NextResponse.json({ success: false, error: checkinError.message }, { status: 400 })
    }

    // Award XP using the proper gamification system
    const newStreak = (checkin?.checkin_streak || 0) + 1
    
    const xpResult = await awardXp(userId, XP_VALUES.DAILY_CHECKIN, "Daily check-in", {
      date: today,
      streak: newStreak,
      walletAddress
    })

    if (!xpResult.success) {
      console.error("Failed to award XP for daily check-in:", xpResult)
    } else {
      // Create notifications for level/rank changes
      if (xpResult.leveledUp) {
        createLevelUpNotification(userId, xpResult.oldLevel, xpResult.newLevel).catch(() => {
          // Silently fail - notifications are not critical
        });
      }
      
      if (xpResult.rankedUp) {
        createRankUpNotification(userId, xpResult.oldRank, xpResult.newRank).catch(() => {
          // Silently fail - notifications are not critical
        });
      }
    }

    // Update streak separately since awardXp doesn't handle streak
    const { error: streakError } = await supabase
      .from("users")
      .update({
        checkin_streak: newStreak,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (streakError) {
      console.error("Failed to update user streak:", streakError)
    }

    return NextResponse.json({
      success: true,
      data: {
        checkin,
        xpEarned: XP_VALUES.DAILY_CHECKIN,
        newXp: xpResult.newXp,
        newStreak,
        message: "Check-in successful!",
      },
    })
  } catch (error) {
    console.error("Daily checkin error:", error)
    return NextResponse.json({ success: false, error: "Failed to check in" }, { status: 500 })
  }
}
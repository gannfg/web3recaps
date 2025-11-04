import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"
import { z } from "zod"

const adjustXpSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int(),
  reason: z.string().min(1).max(500),
  activity: z.string().optional().default("admin_adjustment")
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const adminUserId = auth.user.id

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role, display_name')
      .eq('id', adminUserId)
      .single()

    if (adminError || !adminUser || (adminUser.role !== 'Admin' && adminUser.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, amount, reason, activity } = adjustXpSchema.parse(body)

    // Get target user
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, display_name, total_xp, level, rank')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ success: false, error: "Target user not found" }, { status: 404 })
    }

    const oldXp = targetUser.total_xp || 0
    const newXp = Math.max(0, oldXp + amount) // Prevent negative XP

    // Calculate new level and rank
    const newLevel = Math.floor(newXp / 100) + 1
    const newRank = getRankForXp(newXp)

    // Create XP transaction for audit trail
    const { error: transactionError } = await supabase
      .from('xp_transactions')
      .insert({
        user_id: userId,
        activity,
        xp_earned: amount,
        timestamp: new Date().toISOString(),
        details: JSON.stringify({
          reason,
          adjustedBy: adminUserId,
          adjustedByAdmin: adminUser.display_name,
          oldXp,
          newXp,
          oldLevel: targetUser.level,
          newLevel,
          oldRank: targetUser.rank,
          newRank
        })
      })

    if (transactionError) {
      console.error("Error creating XP transaction:", transactionError)
      return NextResponse.json({ success: false, error: "Failed to create audit trail" }, { status: 500 })
    }

    // Update user's XP
    const { error: updateError } = await supabase
      .from('users')
      .update({
        total_xp: newXp,
        level: newLevel,
        rank: newRank,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error("Error updating user XP:", updateError)
      return NextResponse.json({ success: false, error: "Failed to update user XP" }, { status: 500 })
    }

    // Create notification for the user if XP was added
    if (amount > 0) {
      const { error: notificationError } = await supabase
        .from('gamification_notifications')
        .insert({
          user_id: userId,
          type: 'level_up', // Use level_up type for admin adjustments
          title: 'XP Adjustment',
          message: `An admin has ${amount > 0 ? 'added' : 'removed'} ${Math.abs(amount)} XP to your account. Reason: ${reason}`,
          data: JSON.stringify({
            amount,
            reason,
            adjustedBy: adminUser.display_name,
            oldXp,
            newXp
          })
        })

      if (notificationError) {
        console.error("Error creating notification:", notificationError)
        // Don't fail the request for notification errors
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        userId,
        oldXp,
        newXp,
        amount,
        oldLevel: targetUser.level,
        newLevel,
        oldRank: targetUser.rank,
        newRank,
        reason,
        adjustedBy: adminUser.display_name,
        adjustedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("XP adjustment error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: "Failed to adjust XP" },
      { status: 500 }
    )
  }
}

// Helper function to get rank for XP (copied from gamification.ts)
function getRankForXp(xp: number): string {
  const RANK_THRESHOLDS = [
    { name: "Newcomer", minXp: 0 },
    { name: "Explorer", minXp: 100 },
    { name: "Contributor", minXp: 500 },
    { name: "Builder", minXp: 1000 },
    { name: "Expert", minXp: 2500 },
    { name: "Master", minXp: 5000 },
    { name: "Legend", minXp: 10000 },
    { name: "Champion", minXp: 25000 },
    { name: "Elite", minXp: 50000 },
    { name: "Supreme", minXp: 100000 }
  ]

  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= RANK_THRESHOLDS[i].minXp) {
      return RANK_THRESHOLDS[i].name
    }
  }
  return "Newcomer"
}

import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"
import { z } from "zod"

const awardBadgeSchema = z.object({
  userId: z.string().uuid(),
  badgeId: z.string().uuid(),
  reason: z.string().min(1).max(500).optional()
})

const revokeBadgeSchema = z.object({
  userId: z.string().uuid(),
  badgeId: z.string().uuid(),
  reason: z.string().min(1).max(500).optional()
})

// GET - List all badges and unlock stats
export async function GET(request: NextRequest) {
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
      .select('role')
      .eq('id', adminUserId)
      .single()

    if (adminError || !adminUser || (adminUser.role !== 'Admin' && adminUser.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    // Get all badges with unlock stats
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select(`
        *,
        user_badges!inner(count)
      `)

    if (badgesError) {
      console.error("Error fetching badges:", badgesError)
      return NextResponse.json({ success: false, error: "Failed to fetch badges" }, { status: 500 })
    }

    // Get unlock counts for each badge
    const badgesWithStats = await Promise.all(
      badges?.map(async (badge) => {
        const { count: unlockCount } = await supabase
          .from('user_badges')
          .select('*', { count: 'exact', head: true })
          .eq('badge_id', badge.id)

        return {
          ...badge,
          unlockCount: unlockCount || 0
        }
      }) || []
    )

    return NextResponse.json({
      success: true,
      data: {
        badges: badgesWithStats
      }
    })

  } catch (error) {
    console.error("Badge management error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch badges" },
      { status: 500 }
    )
  }
}

// POST - Manually award badge to user
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
    const { userId, badgeId, reason } = awardBadgeSchema.parse(body)

    // Get target user
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ success: false, error: "Target user not found" }, { status: 404 })
    }

    // Get badge details
    const { data: badge, error: badgeError } = await supabase
      .from('badges')
      .select('id, name, description, rarity')
      .eq('id', badgeId)
      .single()

    if (badgeError || !badge) {
      return NextResponse.json({ success: false, error: "Badge not found" }, { status: 404 })
    }

    // Check if user already has this badge
    const { data: existingBadge, error: existingError } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .single()

    if (existingBadge) {
      return NextResponse.json({ success: false, error: "User already has this badge" }, { status: 400 })
    }

    // Award badge
    const { data: userBadge, error: awardError } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badgeId,
        earned_at: new Date().toISOString(),
        earned_by: 'admin_award'
      })
      .select()
      .single()

    if (awardError) {
      console.error("Error awarding badge:", awardError)
      return NextResponse.json({ success: false, error: "Failed to award badge" }, { status: 500 })
    }

    // Create notification for the user
    const { error: notificationError } = await supabase
      .from('gamification_notifications')
      .insert({
        user_id: userId,
        type: 'badge_unlocked',
        title: 'Badge Awarded by Admin',
        message: `An admin has awarded you the "${badge.name}" badge! ${badge.description}`,
        data: JSON.stringify({
          badgeId,
          badgeName: badge.name,
          badgeDescription: badge.description,
          badgeRarity: badge.rarity,
          awardedBy: adminUser.display_name,
          reason: reason || 'Admin decision'
        })
      })

    if (notificationError) {
      console.error("Error creating notification:", notificationError)
      // Don't fail the request for notification errors
    }

    return NextResponse.json({
      success: true,
      data: {
        userBadge,
        badge,
        targetUser: {
          id: targetUser.id,
          displayName: targetUser.display_name
        },
        awardedBy: adminUser.display_name,
        reason: reason || 'Admin decision',
        awardedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("Badge award error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: "Failed to award badge" },
      { status: 500 }
    )
  }
}

// DELETE - Revoke badge from user
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const badgeId = searchParams.get('badgeId')
    const reason = searchParams.get('reason') || 'Admin decision'

    if (!userId || !badgeId) {
      return NextResponse.json({ success: false, error: "userId and badgeId are required" }, { status: 400 })
    }

    // Get target user
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ success: false, error: "Target user not found" }, { status: 404 })
    }

    // Get badge details
    const { data: badge, error: badgeError } = await supabase
      .from('badges')
      .select('id, name, description')
      .eq('id', badgeId)
      .single()

    if (badgeError || !badge) {
      return NextResponse.json({ success: false, error: "Badge not found" }, { status: 404 })
    }

    // Check if user has this badge
    const { data: existingBadge, error: existingError } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .single()

    if (!existingBadge) {
      return NextResponse.json({ success: false, error: "User does not have this badge" }, { status: 400 })
    }

    // Revoke badge
    const { error: revokeError } = await supabase
      .from('user_badges')
      .delete()
      .eq('user_id', userId)
      .eq('badge_id', badgeId)

    if (revokeError) {
      console.error("Error revoking badge:", revokeError)
      return NextResponse.json({ success: false, error: "Failed to revoke badge" }, { status: 500 })
    }

    // Create notification for the user
    const { error: notificationError } = await supabase
      .from('gamification_notifications')
      .insert({
        user_id: userId,
        type: 'badge_unlocked', // Reuse type for consistency
        title: 'Badge Revoked by Admin',
        message: `An admin has revoked your "${badge.name}" badge. Reason: ${reason}`,
        data: JSON.stringify({
          badgeId,
          badgeName: badge.name,
          badgeDescription: badge.description,
          revokedBy: adminUser.display_name,
          reason
        })
      })

    if (notificationError) {
      console.error("Error creating notification:", notificationError)
      // Don't fail the request for notification errors
    }

    return NextResponse.json({
      success: true,
      data: {
        badge,
        targetUser: {
          id: targetUser.id,
          displayName: targetUser.display_name
        },
        revokedBy: adminUser.display_name,
        reason,
        revokedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("Badge revoke error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to revoke badge" },
      { status: 500 }
    )
  }
}

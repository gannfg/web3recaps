import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"
import { z } from "zod"

const recalculateSchema = z.object({
  userId: z.string().uuid().optional(),
  recalculateAll: z.boolean().default(false)
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
    const { userId, recalculateAll } = recalculateSchema.parse(body)

    if (!recalculateAll && !userId) {
      return NextResponse.json({ success: false, error: "Either userId or recalculateAll must be provided" }, { status: 400 })
    }

    let usersToRecalculate = []

    if (recalculateAll) {
      // Get all users
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, display_name, total_xp, level, rank')

      if (allUsersError) {
        console.error("Error fetching all users:", allUsersError)
        return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 })
      }

      usersToRecalculate = allUsers || []
    } else {
      // Get specific user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, display_name, total_xp, level, rank')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
      }

      usersToRecalculate = [user]
    }

    const results = []
    let successCount = 0
    let errorCount = 0

    for (const user of usersToRecalculate) {
      try {
        // Get all XP transactions for this user
        const { data: transactions, error: transactionsError } = await supabase
          .from('xp_transactions')
          .select('xp_earned')
          .eq('user_id', user.id)

        if (transactionsError) {
          console.error(`Error fetching transactions for user ${user.id}:`, transactionsError)
          results.push({
            userId: user.id,
            displayName: user.display_name,
            success: false,
            error: 'Failed to fetch transactions',
            oldXp: user.total_xp,
            newXp: user.total_xp
          })
          errorCount++
          continue
        }

        // Calculate correct XP
        const correctXp = transactions?.reduce((sum, tx) => sum + (tx.xp_earned || 0), 0) || 0
        const oldXp = user.total_xp || 0
        const newLevel = Math.floor(correctXp / 100) + 1
        const newRank = getRankForXp(correctXp)

        // Update user if XP changed
        if (correctXp !== oldXp) {
          const { error: updateError } = await supabase
            .from('users')
            .update({
              total_xp: correctXp,
              level: newLevel,
              rank: newRank,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

          if (updateError) {
            console.error(`Error updating user ${user.id}:`, updateError)
            results.push({
              userId: user.id,
              displayName: user.display_name,
              success: false,
              error: 'Failed to update user',
              oldXp,
              newXp: correctXp
            })
            errorCount++
            continue
          }

          // Create audit transaction
          const { error: auditError } = await supabase
            .from('xp_transactions')
            .insert({
              user_id: user.id,
              activity: 'admin_recalculation',
              xp_earned: correctXp - oldXp,
              timestamp: new Date().toISOString(),
              details: JSON.stringify({
                recalculatedBy: adminUserId,
                recalculatedByAdmin: adminUser.display_name,
                oldXp,
                newXp: correctXp,
                oldLevel: user.level,
                newLevel,
                oldRank: user.rank,
                newRank,
                transactionCount: transactions?.length || 0
              })
            })

          if (auditError) {
            console.error(`Error creating audit transaction for user ${user.id}:`, auditError)
            // Don't fail the whole operation for audit errors
          }
        }

        results.push({
          userId: user.id,
          displayName: user.display_name,
          success: true,
          oldXp,
          newXp: correctXp,
          oldLevel: user.level,
          newLevel,
          oldRank: user.rank,
          newRank,
          xpDifference: correctXp - oldXp,
          transactionCount: transactions?.length || 0
        })

        successCount++

      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError)
        results.push({
          userId: user.id,
          displayName: user.display_name,
          success: false,
          error: userError instanceof Error ? userError.message : 'Unknown error',
          oldXp: user.total_xp,
          newXp: user.total_xp
        })
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProcessed: usersToRecalculate.length,
          successCount,
          errorCount,
          recalculatedBy: adminUser.display_name,
          recalculatedAt: new Date().toISOString()
        },
        results
      }
    })

  } catch (error) {
    console.error("XP recalculation error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: "Failed to recalculate XP" },
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

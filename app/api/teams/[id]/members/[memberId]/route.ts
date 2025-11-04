import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"

const ACCESS_COOKIE = "sb-access-token"
const REFRESH_COOKIE = "sb-refresh-token"

async function getAuthedClient(request: NextRequest) {
  const auth = await requireUser(request)
  if (!auth.supabase || !auth.user) return { supabase: null, user: null }
  return { supabase: auth.supabase, user: auth.user }
}

// PATCH /api/teams/[id]/members/[memberId] - Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const userId = user.id

    const teamId = params.id
    const memberId = params.memberId
    const body = await request.json()
    const { role } = body

    if (!role) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 })
    }

    // Check if user is team leader or co-leader
    const { data: requesterMemberData } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    const { data: teamData } = await supabase
      .from('teams')
      .select('created_by')
      .eq('id', teamId)
      .single()

    if (!teamData) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    const isLeader = teamData.created_by === userId || (requesterMemberData && (requesterMemberData.role === 'leader' || requesterMemberData.role === 'co_leader'))

    if (!isLeader) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Find member to update
    const { data: memberData, error: memberError } = await supabase
      .from('team_members')
      .select('*, users(id, display_name, email, avatar_url)')
      .eq('id', memberId)
      .eq('team_id', teamId)
      .single()

    if (memberError || !memberData) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Prevent changing leader role
    if (memberData.role === 'leader') {
      return NextResponse.json({ error: "Cannot change leader role" }, { status: 400 })
    }

    // Update member role
    const { data: updatedMember, error: updateError } = await supabase
      .from('team_members')
      .update({ role })
      .eq('id', memberId)
      .select('*, users(id, display_name, email, avatar_url)')
      .single()

    if (updateError) {
      console.error("Update member role error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedMember.id,
        userId: updatedMember.user_id,
        role: updatedMember.role,
        joinedAt: updatedMember.joined_at,
        contributionScore: updatedMember.contribution_score,
        isActive: updatedMember.is_active,
        user: updatedMember.users
      },
    })
  } catch (error) {
    console.error("Update member role error:", error)
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    )
  }
}

// DELETE /api/teams/[id]/members/[memberId] - Remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const userId = user.id

    const teamId = params.id
    const memberId = params.memberId

    // Check if user is team leader or co-leader
    const { data: requesterMemberData } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    const { data: teamData } = await supabase
      .from('teams')
      .select('created_by')
      .eq('id', teamId)
      .single()

    if (!teamData) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    const isLeader = teamData.created_by === userId || (requesterMemberData && (requesterMemberData.role === 'leader' || requesterMemberData.role === 'co_leader'))

    if (!isLeader) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Find member to remove
    const { data: memberData, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('id', memberId)
      .eq('team_id', teamId)
      .single()

    if (memberError || !memberData) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Prevent removing leader
    if (memberData.role === 'leader') {
      return NextResponse.json({ error: "Cannot remove team leader" }, { status: 400 })
    }

    // Remove member (soft delete by setting is_active to false)
    const { error: deleteError } = await supabase
      .from('team_members')
      .update({ is_active: false })
      .eq('id', memberId)

    if (deleteError) {
      console.error("Remove member error:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
    })
  } catch (error) {
    console.error("Remove member error:", error)
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    )
  }
}
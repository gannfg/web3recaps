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

// DELETE /api/teams/[id]/invitations/[invitationId] - Cancel invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; invitationId: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const userId = user.id

    const teamId = params.id
    const invitationId = params.invitationId

    // Check if user is team leader or co-leader
    const { data: memberData } = await supabase
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

    const isLeader = teamData.created_by === userId || (memberData && (memberData.role === 'leader' || memberData.role === 'co_leader'))

    if (!isLeader) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Delete invitation
    const { error } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId)
      .eq('team_id', teamId)

    if (error) {
      console.error("Delete invitation error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Invitation cancelled successfully",
    })
  } catch (error) {
    console.error("Cancel invitation error:", error)
    return NextResponse.json(
      { error: "Failed to cancel invitation" },
      { status: 500 }
    )
  }
}

// PATCH /api/teams/[id]/invitations/[invitationId] - Accept/decline invitation
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; invitationId: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const userId = user.id

    const teamId = params.id
    const invitationId = params.invitationId
    const body = await request.json()
    const { action } = body // 'accept' or 'decline'

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'accept' or 'decline'" }, { status: 400 })
    }

    // Find invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('team_id', teamId)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    // Check if user can respond to this invitation
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    const canRespond = invitation.invitee_id === userId || 
      (invitation.invitee_email && userData?.email === invitation.invitee_email)

    if (!canRespond) {
      return NextResponse.json({ error: "You cannot respond to this invitation" }, { status: 403 })
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: "Invitation is no longer valid" }, { status: 400 })
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 400 })
    }

    if (action === 'accept') {
      // Check if team is full
      const { data: teamData } = await supabase
        .from('teams')
        .select('max_members')
        .eq('id', teamId)
        .single()

      if (!teamData) {
        return NextResponse.json({ error: "Team not found" }, { status: 404 })
      }

      const { count: currentMemberCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('is_active', true)

      if (currentMemberCount && currentMemberCount >= teamData.max_members) {
        return NextResponse.json({ error: "Team is at maximum capacity" }, { status: 400 })
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (existingMember) {
        return NextResponse.json({ error: "You are already a team member" }, { status: 400 })
      }

      // Add user as team member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          role: invitation.role,
          permissions: [],
          contribution_score: 0,
          is_active: true,
        })

      if (memberError) {
        console.error("Add member error:", memberError)
        return NextResponse.json({ error: "Failed to add team member" }, { status: 400 })
      }
    }

    // Update invitation status
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('team_invitations')
      .update({ status: action === 'accept' ? 'accepted' : 'declined' })
      .eq('id', invitationId)
      .select()
      .single()

    if (updateError) {
      console.error("Update invitation error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Invitation ${action}ed successfully`,
      data: updatedInvitation,
    })
  } catch (error) {
    console.error("Respond to invitation error:", error)
    return NextResponse.json(
      { error: "Failed to respond to invitation" },
      { status: 500 }
    )
  }
}
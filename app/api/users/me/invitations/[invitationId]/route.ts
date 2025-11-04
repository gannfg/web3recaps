import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { awardXp } from "@/lib/gamification"
import { XP_VALUES } from "@/lib/types"
import { createNotification } from "@/lib/notification-service"

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

// PATCH /api/users/me/invitations/[invitationId] - Accept or decline invitation
export async function PATCH(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
  try {
    const { supabase } = await getAuthedClient(request)
    if (!supabase) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const userId = userRes.user.id

    const body = await request.json()
    const { action } = body // 'accept' or 'decline'

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action. Must be 'accept' or 'decline'" }, { status: 400 })
    }

    const invitationId = params.invitationId

    // Get the invitation to verify ownership and status
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select(`
        *,
        team:teams!team_invitations_team_id_fkey(
          id,
          name,
          max_members
        )
      `)
      .eq('id', invitationId)
      .or(`invitee_id.eq.${userId},invitee_email.eq.${userRes.user.email}`)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ success: false, error: "Invitation not found" }, { status: 404 })
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ success: false, error: "Invitation is no longer pending" }, { status: 400 })
    }

    if (action === 'accept') {
      // Check if team is full
      const { count: currentMemberCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', invitation.team.id)
        .eq('is_active', true)

      if (currentMemberCount && currentMemberCount >= invitation.team.max_members) {
        return NextResponse.json({ success: false, error: "Team is at maximum capacity" }, { status: 400 })
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', invitation.team.id)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (existingMember) {
        return NextResponse.json({ success: false, error: "You are already a member of this team" }, { status: 400 })
      }

      // Add user to team
      const { error: addMemberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invitation.team.id,
          user_id: userId,
          role: invitation.role,
          is_active: true
        })

      if (addMemberError) {
        console.error("Add member error:", addMemberError)
        return NextResponse.json({ success: false, error: "Failed to add member to team" }, { status: 500 })
      }

      // Award XP for accepting team invitation
      awardXp(userId, XP_VALUES.ACCEPT_TEAM_INVITE, "Accepted team invitation", { 
        teamId: invitation.team.id,
        teamName: invitation.team.name
      }).catch(() => {
        // Silently fail - XP will be handled by background processes
      });
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('team_invitations')
      .update({
        status: action === 'accept' ? 'accepted' : 'declined',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error("Update invitation error:", updateError)
      return NextResponse.json({ success: false, error: "Failed to update invitation" }, { status: 500 })
    }

    // Notify the inviter about the response
    if (invitation.inviter_id !== userId) {
      createNotification({
        userId: invitation.inviter_id,
        type: action === 'accept' ? 'invitation_accepted' : 'invitation_declined',
        title: `Team invitation ${action === 'accept' ? 'accepted' : 'declined'}`,
        message: `Your invitation to join "${invitation.team.name}" was ${action === 'accept' ? 'accepted' : 'declined'}`,
        actionUrl: `/teams/${invitation.team.id}`,
        actorId: userId,
        entityType: 'team',
        entityId: invitation.team.id
      }).catch(() => {
        // Silently fail - notifications are not critical
      });
    }

    return NextResponse.json({
      success: true,
      data: { action, invitationId }
    })

  } catch (error) {
    console.error("Handle invitation error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

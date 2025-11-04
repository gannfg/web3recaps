import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"
import { notifyTeamInvitation } from "@/lib/notification-service"

async function getAuthedClient(request: NextRequest) {
  const auth = await requireUser(request)
  if (!auth.supabase || !auth.user) return { supabase: null, user: null }
  return { supabase: auth.supabase, user: auth.user }
}

// GET /api/teams/[id]/invitations - Get team invitations
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const userId = user.id

    const teamId = params.id

    // Check if user is team leader or co-leader
    const { data: memberData, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('created_by')
      .eq('id', teamId)
      .single()

    // Debug logging
    console.log("Team invitations permission check:", {
      teamId,
      userId,
      memberData,
      memberError: memberError?.message,
      teamData,
      teamError: teamError?.message,
      isCreator: teamData?.created_by === userId,
      memberRole: memberData?.role
    })

    if (!teamData) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    const isLeader = teamData.created_by === userId || (memberData && (memberData.role === 'leader' || memberData.role === 'co_leader'))

    if (!isLeader) {
      console.log("Access denied - not a leader:", { isCreator: teamData.created_by === userId, memberData })
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Get team invitations with inviter details
    const { data: invitations, error } = await supabase
      .from('team_invitations')
      .select(`
        *,
        inviter:users!team_invitations_inviter_id_fkey(id, display_name, avatar_url)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Get invitations error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: invitations || [],
    })
  } catch (error) {
    console.error("Get team invitations error:", error)
    return NextResponse.json(
      { error: "Failed to get team invitations" },
      { status: 500 }
    )
  }
}

// POST /api/teams/[id]/invitations - Create team invitation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const userId = user.id

    const teamId = params.id
    const body = await request.json()
    const { inviteeEmail, inviteeId, role, message } = body

    // Validate required fields
    if (!inviteeEmail && !inviteeId) {
      return NextResponse.json({ error: "Either inviteeEmail or inviteeId is required" }, { status: 400 })
    }

    if (!role) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 })
    }

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
      .select('created_by, max_members, name')
      .eq('id', teamId)
      .single()

    if (!teamData) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    const isLeader = teamData.created_by === userId || (memberData && (memberData.role === 'leader' || memberData.role === 'co_leader'))

    if (!isLeader) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Check if team is full
    const { count: currentMemberCount } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('is_active', true)

    if (currentMemberCount && currentMemberCount >= teamData.max_members) {
      return NextResponse.json({ error: "Team is at maximum capacity" }, { status: 400 })
    }

    // Find target user if email provided
    let targetUserId = inviteeId
    if (inviteeEmail && !targetUserId) {
      const { data: targetUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteeEmail)
        .single()
      
      targetUserId = targetUser?.id
    }

    // Check if user is already a member or has pending invitation
    if (targetUserId) {
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .single()

      if (existingMember) {
        return NextResponse.json({ error: "User is already a team member" }, { status: 400 })
      }

      const { data: existingInvitation } = await supabase
        .from('team_invitations')
        .select('id')
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .or(`invitee_id.eq.${targetUserId},invitee_email.eq.${inviteeEmail}`)
        .single()

      if (existingInvitation) {
        return NextResponse.json({ error: "User already has a pending invitation" }, { status: 400 })
      }
    }

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        inviter_id: userId,
        invitee_id: targetUserId,
        invitee_email: inviteeEmail,
        status: 'pending',
        role: role,
        message: message || null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single()

    if (error) {
      console.error("Create invitation error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Send notification to invitee
    if (targetUserId) {
      notifyTeamInvitation(teamId, teamData.name, targetUserId, userId).catch(() => {
        // Silently fail - notifications are not critical
      });
    }

    // TODO: Send email notification in production

    return NextResponse.json({
      success: true,
      data: invitation,
    })
  } catch (error) {
    console.error("Create team invitation error:", error)
    return NextResponse.json(
      { error: "Failed to create team invitation" },
      { status: 500 }
    )
  }
}
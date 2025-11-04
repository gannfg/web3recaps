import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

async function getAuthedClient() {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { supabase: null, user: null }

  return { supabase, user }
}

// PATCH /api/invitations/[invitationId]/respond - Accept or decline invitation
export async function PATCH(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient()
    if (!supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action } = await request.json() // 'accept' or 'decline'
    
    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'accept' or 'decline'" }, { status: 400 })
    }

    const invitationId = params.invitationId

    // Get the invitation and verify it belongs to the current user
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select(`
        *,
        team:teams(id, name, max_members)
      `)
      .eq('id', invitationId)
      .eq('invitee_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ error: "Invitation not found or expired" }, { status: 404 })
    }

    if (action === 'accept') {
      // Check if team is at capacity
      const { count: currentMemberCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', invitation.team_id)
        .eq('is_active', true)

      if (currentMemberCount && currentMemberCount >= invitation.team.max_members) {
        return NextResponse.json({ error: "Team is at maximum capacity" }, { status: 400 })
      }

      // Check if user is already a member (shouldn't happen, but safety check)
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', invitation.team_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (existingMember) {
        return NextResponse.json({ error: "You are already a member of this team" }, { status: 400 })
      }

      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          user_id: user.id,
          role: invitation.role,
          permissions: invitation.role === 'leader' || invitation.role === 'co_leader' ? ['all'] : [],
          contribution_score: 0,
          is_active: true,
        })

      if (memberError) {
        console.error("Add team member error:", memberError)
        return NextResponse.json({ error: "Failed to join team" }, { status: 400 })
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      if (updateError) {
        console.error("Update invitation status error:", updateError)
        // Don't fail here since the user was already added to the team
      }

      return NextResponse.json({
        success: true,
        data: { message: `Successfully joined ${invitation.team.name}!` }
      })

    } else if (action === 'decline') {
      // Update invitation status to declined
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ 
          status: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      if (updateError) {
        console.error("Update invitation status error:", updateError)
        return NextResponse.json({ error: "Failed to decline invitation" }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: { message: "Invitation declined" }
      })
    }

  } catch (error) {
    console.error("Respond to invitation error:", error)
    return NextResponse.json(
      { error: "Failed to respond to invitation" },
      { status: 500 }
    )
  }
}

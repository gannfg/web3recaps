import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"

async function getAuthedClient(request: NextRequest) {
  const supabase = createSupabaseServer()
  if (!supabase) return { supabase: null }
  return { supabase }
}

// GET /api/teams/[id] - Get team details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase } = await getAuthedClient(request)
    if (!supabase) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const teamId = params.id
    // currentUserId is optional for shaping response; try to infer from session
    let currentUserId: string | null = null
    const { data: userRes } = await supabase.auth.getUser()
    if (userRes && userRes.user) currentUserId = userRes.user.id

    // Fetch team, members, projects and achievements in parallel for lower latency
    const [teamRes, membersRes, projectsRes, achievementsRes] = await Promise.all([
      supabase.from('teams').select('*').eq('id', teamId).single(),
      supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          role,
          permissions,
          contribution_score,
          is_active,
          joined_at
        `)
        .eq('team_id', teamId)
        .eq('is_active', true),
      supabase.from('team_projects').select('*').eq('team_id', teamId),
      supabase.from('team_achievements').select('*').eq('team_id', teamId),
    ])

    const { data: team, error: teamError } = teamRes
    if (teamError || !team) {
      console.log("Team fetch error:", { teamError: teamError?.message, teamId })
      return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 })
    }

    const { data: teamMembers, error: membersError } = membersRes
    if (membersError) {
      console.error("Team members query error:", membersError)
      return NextResponse.json({ success: false, error: "Failed to load team members" }, { status: 500 })
    }
    const { data: teamProjects } = projectsRes
    const { data: teamAchievements } = achievementsRes

    // Get other users' data from database
    const otherUserIds = teamMembers?.filter(tm => tm.user_id !== currentUserId).map(tm => tm.user_id) || []
    let otherUsersData: Record<string, any> = {}
    
    if (otherUserIds.length > 0) {
      const { data: otherUsers } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, email')
        .in('id', otherUserIds)
      
      
      if (otherUsers) {
        otherUsersData = otherUsers.reduce((acc: Record<string, any>, user) => {
          
          acc[user.id] = {
            id: user.id,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            email: user.email
          }
          return acc
        }, {})
      }
    }

    // Transform the members data
    const members = (teamMembers || []).map((tm: any) => {
      // For current user, use null (frontend will use session data)
      // For other users, use database data
      const userData = tm.user_id === currentUserId ? null : otherUsersData[tm.user_id] || null
      
      return {
        id: `${teamId}_${tm.user_id}`, // Generate member ID
        userId: tm.user_id, // Add userId field that frontend expects
        role: tm.role,
        permissions: tm.permissions || [],
        contributionScore: tm.contribution_score || 0,
        isActive: tm.is_active,
        joinedAt: tm.joined_at,
        user: userData
      }
    })

    const responseTeam = {
      id: team.id,
      name: team.name,
      description: team.description,
      avatarUrl: team.avatar_url,
      skills: team.skills || [],
      skillsRequired: team.skills_required || [],
      createdBy: team.created_by, // Explicitly map this field
      maxMembers: team.max_members,
      currentMemberCount: members.length,
      status: team.status,
      projectType: team.project_type,
      timeline: team.timeline,
      location: team.location,
      githubUrl: team.github_url,
      figmaUrl: team.figma_url,
      websiteUrl: team.website_url,
      discordUrl: team.discord_url,
      totalXp: team.total_xp || 0,
      teamLevel: team.team_level || 1,
      foundedDate: team.founded_date,
      budgetRange: team.budget_range,
      equitySplit: team.equity_split || {},
      meetingSchedule: team.meeting_schedule,
      tags: team.tags || [],
      createdAt: team.created_at,
      updatedAt: team.updated_at,
      members,
      projects: teamProjects || [],
      achievements: teamAchievements || []
    }

    const res = NextResponse.json({ success: true, data: responseTeam })
    // Short-lived caching to improve perceived performance without staleness issues
    res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120')
    return res

  } catch (error) {
    console.error("Team fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch team" }, { status: 500 })
  }
}

// PATCH /api/teams/[id] - Update team
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase } = await getAuthedClient(request)
    if (!supabase) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const userId = userRes.user.id

    const teamId = params.id
    const body = await request.json()

    // Check if user has permission to update this team
    // First check if user is the team creator
    const { data: team } = await supabase
      .from('teams')
      .select('created_by')
      .eq('id', teamId)
      .single()

    if (!team) {
      return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 })
    }

    // Check if user is the creator or a team leader/co-leader
    const isCreator = team.created_by === userId
    
    if (!isCreator) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('role, permissions')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (!membership || !['leader', 'co_leader'].includes(membership.role)) {
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
      }
    }

    // Update the team
    const updates: any = {}
    const allowedFields = [
      'name', 'description', 'avatar_url', 'skills', 'skills_required', 
      'max_members', 'status', 'project_type', 'timeline', 'location',
      'github_url', 'figma_url', 'website_url', 'discord_url',
      'budget_range', 'meeting_schedule', 'tags'
    ]

    console.log("Team update request body:", body)

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Convert camelCase to snake_case for database
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase()
        updates[dbField] = body[field]
      }
    }

    // Handle special case for avatarUrl -> avatar_url
    if (body.avatarUrl !== undefined) {
      updates.avatar_url = body.avatarUrl
    }

    console.log("Updates to apply:", updates)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields to update" }, { status: 400 })
    }

    const { data: updatedTeam, error: updateError } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: { team: updatedTeam }
    })

  } catch (error) {
    console.error("Team update error:", error)
    return NextResponse.json({ success: false, error: "Failed to update team" }, { status: 500 })
  }
}

// DELETE /api/teams/[id] - Delete team
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase } = await getAuthedClient(request)
    if (!supabase) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const userId = userRes.user.id

    const teamId = params.id

    // Check if user is the team creator/leader
    const { data: team } = await supabase
      .from('teams')
      .select('created_by')
      .eq('id', teamId)
      .single()

    if (!team || team.created_by !== userId) {
      return NextResponse.json({ success: false, error: "Only team creators can delete teams" }, { status: 403 })
    }

    // Delete related records first (since we don't have CASCADE DELETE)
    console.log("Deleting related records for team:", teamId)
    
    // Delete team members
    const { error: membersError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
    
    if (membersError) {
      console.error("Error deleting team members:", membersError)
      return NextResponse.json({ success: false, error: "Failed to delete team members" }, { status: 500 })
    }

    // Delete team invitations
    const { error: invitationsError } = await supabase
      .from('team_invitations')
      .delete()
      .eq('team_id', teamId)
    
    if (invitationsError) {
      console.error("Error deleting team invitations:", invitationsError)
      return NextResponse.json({ success: false, error: "Failed to delete team invitations" }, { status: 500 })
    }

    // Delete team projects
    const { error: projectsError } = await supabase
      .from('projects')
      .delete()
      .eq('team_id', teamId)
    
    if (projectsError) {
      console.error("Error deleting team projects:", projectsError)
      return NextResponse.json({ success: false, error: "Failed to delete team projects" }, { status: 500 })
    }

    // Delete team achievements
    const { error: achievementsError } = await supabase
      .from('team_achievements')
      .delete()
      .eq('team_id', teamId)
    
    if (achievementsError) {
      console.error("Error deleting team achievements:", achievementsError)
      return NextResponse.json({ success: false, error: "Failed to delete team achievements" }, { status: 500 })
    }

    // Delete team activity
    const { error: activityError } = await supabase
      .from('team_activity')
      .delete()
      .eq('team_id', teamId)
    
    if (activityError) {
      console.error("Error deleting team activity:", activityError)
      return NextResponse.json({ success: false, error: "Failed to delete team activity" }, { status: 500 })
    }

    // Finally delete the team
    console.log("Deleting team:", teamId)
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (deleteError) {
      console.error("Error deleting team:", deleteError)
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 400 })
    }

    console.log("Team deleted successfully:", teamId)

    return NextResponse.json({
      success: true,
      data: { message: "Team deleted successfully" }
    })

  } catch (error) {
    console.error("Team deletion error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete team" }, { status: 500 })
  }
}

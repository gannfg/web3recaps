import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { awardXp } from "@/lib/gamification"
import { XP_VALUES } from "@/lib/types"

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

// GET /api/teams - List teams with filtering
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await getAuthedClient(request)
    if (!supabase) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const projectType = searchParams.get('projectType')
    const location = searchParams.get('location')
    const budgetRange = searchParams.get('budgetRange')
    const search = searchParams.get('search')
    const skills = searchParams.get('skills')?.split(',') || []
    const member = searchParams.get('member') // Filter by member ID
    const minSize = parseInt(searchParams.get('minSize') || '1')
    const maxSize = parseInt(searchParams.get('maxSize') || '10')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build base query
    let query = supabase
      .from('teams')
      .select(`
        *,
        team_members!inner(
          id,
          user_id,
          role,
          joined_at,
          contribution_score,
          is_active,
          users(id, display_name, email, avatar_url)
        )
      `)
      .order('created_at', { ascending: false })

    // If filtering by member, add member filter
    if (member) {
      query = query.eq('team_members.user_id', member).eq('team_members.is_active', true)
    } else {
      // Only get active members for general listing
      query = query.eq('team_members.is_active', true)
    }

    // Apply other filters
    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (projectType && projectType !== 'all') {
      query = query.eq('project_type', projectType)
    }
    if (location && location !== 'all') {
      query = query.eq('location', location)
    }
    if (budgetRange && budgetRange !== 'all') {
      query = query.eq('budget_range', budgetRange)
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    if (skills.length > 0) {
      query = query.overlaps('skills_required', skills)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: teamsData, error } = await query

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    // Transform the data to match our frontend types
    const teams = teamsData?.map((team: any) => {
      const members = team.team_members
        .filter((tm: any) => tm.is_active)
        .map((tm: any) => ({
          id: tm.id,
          userId: tm.user_id,
          role: tm.role,
          joinedAt: tm.joined_at,
          contributionScore: tm.contribution_score,
          isActive: tm.is_active,
          user: tm.users
        }))

      // If filtering by member, include member info
      let memberInfo = undefined
      if (member) {
        memberInfo = members.find((m: any) => m.userId === member)
      }

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        avatarUrl: team.avatar_url,
        skills: team.skills || [],
        skillsRequired: team.skills_required || [],
        createdBy: team.created_by,
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
        ...(memberInfo && { memberInfo })
      }
    }) || []

    // Apply team size filtering (after data transformation since it depends on member count)
    let filteredTeams = teams
    if (minSize > 1 || maxSize < 10) {
      filteredTeams = teams.filter(team => {
        const memberCount = team.currentMemberCount || 0
        return memberCount >= minSize && memberCount <= maxSize
      })
    }

    // If filtering by member, return the teams directly
    if (member) {
      return NextResponse.json({
        success: true,
        data: filteredTeams,
      })
    }

    // Get stats for dashboard (separate query for performance)
    const { data: statsData } = await supabase
      .from('teams')
      .select('status')

    const stats = {
      total: statsData?.length || 0,
      recruiting: statsData?.filter((t: any) => t.status === 'recruiting').length || 0,
      active: statsData?.filter((t: any) => t.status === 'active').length || 0,
      completed: statsData?.filter((t: any) => t.status === 'completed').length || 0,
    }

    return NextResponse.json({
      success: true,
      data: {
        teams: filteredTeams,
        stats,
        hasMore: filteredTeams.length === limit,
        total: statsData?.length || 0
      }
    })
  } catch (error) {
    console.error("Get teams error:", error)
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    )
  }
}

// POST /api/teams - Create new team
export async function POST(request: NextRequest) {
  try {
    const { supabase } = await getAuthedClient(request)
    if (!supabase) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    // Derive user from Supabase cookies
    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = userRes.user.id

    const body = await request.json()
    const {
      name,
      description,
      avatarUrl,
      skills = [],
      skillsRequired = [],
      maxMembers = 5,
      projectType = "hackathon",
      timeline,
      location = "remote",
      budgetRange,
      meetingSchedule,
      githubUrl,
      figmaUrl,
      websiteUrl,
      discordUrl,
      tags = [],
    } = body

    // Validate required fields
    if (!name?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "Name and description are required" }, { status: 400 })
    }

    // Create team with proper created_by field
    console.log("Creating team with userId:", userId)
    
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        description: description.trim(),
        avatar_url: avatarUrl || null,
        skills,
        skills_required: skillsRequired,
        created_by: userId, // Make sure this is set
        max_members: maxMembers,
        status: 'recruiting',
        project_type: projectType,
        timeline: timeline || null,
        location,
        budget_range: budgetRange || null,
        meeting_schedule: meetingSchedule || null,
        github_url: githubUrl || null,
        figma_url: figmaUrl || null,
        website_url: websiteUrl || null,
        discord_url: discordUrl || null,
        total_xp: 0,
        team_level: 1,
        tags,
      })
      .select()
      .single()

    console.log("Team created:", { teamId: teamData?.id, createdBy: teamData?.created_by, userId })

    if (teamError) {
      console.error("Team creation error:", teamError)
      return NextResponse.json({ error: teamError.message }, { status: 400 })
    }

    // Add creator as team leader
    console.log("Creating team member record:", {
      team_id: teamData.id,
      user_id: userId,
      role: 'leader'
    })

    const { data: memberData, error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamData.id,
        user_id: userId,
        role: 'leader',
        permissions: ['all'],
        contribution_score: 0,
        is_active: true,
      })
      .select()

    if (memberError) {
      console.error("Team member creation error:", memberError)
      // Try to clean up the team if member creation failed
      await supabase.from('teams').delete().eq('id', teamData.id)
      return NextResponse.json({ error: "Failed to create team membership" }, { status: 400 })
    }

    console.log("Team member created successfully:", memberData)

    // Award XP for creating team
    awardXp(userId, XP_VALUES.CREATE_TEAM, "Created team", { 
      teamId: teamData.id,
      teamName: teamData.name
    }).catch(() => {
      // Silently fail - XP will be handled by background processes
    });

    // Check if it's user's first team and award bonus
    const { count } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId)

    if (count === 1) {
      awardXp(userId, XP_VALUES.FIRST_TEAM_CREATION, "First team created", {
        teamId: teamData.id
      }).catch(() => {
        // Silently fail - XP will be handled by background processes
      });
    }

    // Get user info for response
    const { data: userData } = await supabase
      .from('users')
      .select('id, display_name, email, avatar_url')
      .eq('id', userId)
      .single()

    // Return enhanced team data
    const enhancedTeam = {
      id: teamData.id,
      name: teamData.name,
      description: teamData.description,
      avatarUrl: teamData.avatar_url,
      skills: teamData.skills || [],
      skillsRequired: teamData.skills_required || [],
      createdBy: teamData.created_by,
      maxMembers: teamData.max_members,
      currentMemberCount: 1,
      status: teamData.status,
      projectType: teamData.project_type,
      timeline: teamData.timeline,
      location: teamData.location,
      githubUrl: teamData.github_url,
      figmaUrl: teamData.figma_url,
      websiteUrl: teamData.website_url,
      discordUrl: teamData.discord_url,
      totalXp: teamData.total_xp,
      teamLevel: teamData.team_level,
      foundedDate: teamData.founded_date,
      budgetRange: teamData.budget_range,
      meetingSchedule: teamData.meeting_schedule,
      tags: teamData.tags || [],
      createdAt: teamData.created_at,
      updatedAt: teamData.updated_at,
      members: userData ? [{
        id: `${teamData.id}_${userId}`,
        userId: userId,
        role: 'leader',
        joinedAt: teamData.created_at,
        contributionScore: 0,
        isActive: true,
        user: userData
      }] : []
    }

    return NextResponse.json({
      success: true,
      data: enhancedTeam,
    })
  } catch (error) {
    console.error("Create team error:", error)
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    )
  }
}
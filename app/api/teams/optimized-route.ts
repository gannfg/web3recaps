import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { optimizeApiResponse, paginateData } from "@/lib/performance-optimizations"

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

// Optimized GET /api/teams - List teams with performance improvements
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
    const member = searchParams.get('member')
    const minSize = parseInt(searchParams.get('minSize') || '1')
    const maxSize = parseInt(searchParams.get('maxSize') || '10')
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 30) // Reduced limit
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build optimized query with minimal fields for list view
    let query = supabase
      .from('teams')
      .select(`
        id,
        name,
        description,
        avatar_url,
        skills,
        max_members,
        current_member_count,
        status,
        project_type,
        location,
        total_xp,
        team_level,
        created_at,
        updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
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

    // If filtering by member, get teams with member info
    if (member) {
      const { data: memberTeams } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          joined_at,
          contribution_score,
          teams!inner(
            id,
            name,
            description,
            avatar_url,
            skills,
            max_members,
            current_member_count,
            status,
            project_type,
            location,
            total_xp,
            team_level,
            created_at
          )
        `)
        .eq('user_id', member)
        .eq('is_active', true)

      const teams = memberTeams?.map((mt: any) => ({
        id: mt.teams.id,
        name: mt.teams.name,
        description: mt.teams.description,
        avatarUrl: mt.teams.avatar_url ? 
          `${mt.teams.avatar_url}?width=100&height=100&quality=80&format=webp` : 
          null,
        skills: mt.teams.skills || [],
        maxMembers: mt.teams.max_members,
        currentMemberCount: mt.teams.current_member_count,
        status: mt.teams.status,
        projectType: mt.teams.project_type,
        location: mt.teams.location,
        totalXp: mt.teams.total_xp || 0,
        teamLevel: mt.teams.team_level || 1,
        createdAt: mt.teams.created_at,
        memberInfo: {
          role: mt.role,
          joinedAt: mt.joined_at,
          contributionScore: mt.contribution_score
        }
      })) || []

      return NextResponse.json({
        success: true,
        data: teams,
      })
    }

    // Transform teams data with optimized image URLs
    const teams = teamsData?.map((team: any) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      avatarUrl: team.avatar_url ? 
        `${team.avatar_url}?width=100&height=100&quality=80&format=webp` : 
        null,
      skills: team.skills || [],
      maxMembers: team.max_members,
      currentMemberCount: team.current_member_count,
      status: team.status,
      projectType: team.project_type,
      location: team.location,
      totalXp: team.total_xp || 0,
      teamLevel: team.team_level || 1,
      createdAt: team.created_at,
      updatedAt: team.updated_at
    })) || []

    // Apply team size filtering
    let filteredTeams = teams
    if (minSize > 1 || maxSize < 10) {
      filteredTeams = teams.filter(team => {
        const memberCount = team.currentMemberCount || 0
        return memberCount >= minSize && memberCount <= maxSize
      })
    }

    // Get basic stats (separate lightweight query)
    const { data: statsData } = await supabase
      .from('teams')
      .select('status')
      .limit(1000) // Limit for performance

    const stats = {
      total: statsData?.length || 0,
      recruiting: statsData?.filter((t: any) => t.status === 'recruiting').length || 0,
      active: statsData?.filter((t: any) => t.status === 'active').length || 0,
      completed: statsData?.filter((t: any) => t.status === 'completed').length || 0,
    }

    // Optimize response data
    const optimizedTeams = optimizeApiResponse(filteredTeams)

    return NextResponse.json({
      success: true,
      data: {
        teams: optimizedTeams,
        stats,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total: teamsData?.length || 0,
          totalPages: Math.ceil((teamsData?.length || 0) / limit),
          hasNext: (offset + limit) < (teamsData?.length || 0),
          hasPrev: offset > 0
        }
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

// Optimized POST /api/teams - Create new team
export async function POST(request: NextRequest) {
  try {
    const { supabase } = await getAuthedClient(request)
    if (!supabase) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

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

    // Create team with optimized data
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        description: description.trim(),
        avatar_url: avatarUrl || null,
        skills,
        skills_required: skillsRequired,
        created_by: userId,
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

    if (teamError) {
      console.error("Team creation error:", teamError)
      return NextResponse.json({ error: teamError.message }, { status: 400 })
    }

    // Add creator as team leader
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
      await supabase.from('teams').delete().eq('id', teamData.id)
      return NextResponse.json({ error: "Failed to create team membership" }, { status: 400 })
    }

    // Return optimized team data
    const optimizedTeam = optimizeApiResponse({
      id: teamData.id,
      name: teamData.name,
      description: teamData.description,
      avatarUrl: teamData.avatar_url ? 
        `${teamData.avatar_url}?width=100&height=100&quality=80&format=webp` : 
        null,
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
      updatedAt: teamData.updated_at
    })

    return NextResponse.json({
      success: true,
      data: optimizedTeam,
    })
  } catch (error) {
    console.error("Create team error:", error)
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"

const ACCESS_COOKIE = "sb-access-token"
const REFRESH_COOKIE = "sb-refresh-token"

async function getAuthedClient(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value
  const supabase = createSupabaseServer()
  if (!supabase || !access || !refresh) return { supabase: null, user: null }
  
  await supabase.auth.setSession({ access_token: access, refresh_token: refresh })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { supabase: null, user: null }
  
  return { supabase, user }
}

// GET /api/projects/[id] - Get project details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const projectId = params.id

    // Get project with all related data
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        team:teams(
          id,
          name,
          description,
          avatar_url,
          created_by
        ),
        contributors:project_contributors(
          id,
          user_id,
          role,
          contribution_description,
          hours_contributed,
          is_active,
          joined_at,
          user:users(id, display_name, avatar_url, bio)
        ),
        updates:project_updates(
          id,
          title,
          content,
          update_type,
          version,
          images,
          created_at,
          author:users(id, display_name, avatar_url)
        )
      `)
      .eq('id', projectId)
      .eq('is_public', true)
      .single()

    if (error) {
      console.error("Get project error:", error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Project not found" }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Record view if user is authenticated
    if (user) {
      // Check if user has viewed this project recently (within last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      
      const { data: recentView } = await supabase
        .from('project_views')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .gte('viewed_at', oneHourAgo)
        .single()

      // Only record view if no recent view exists
      if (!recentView) {
        await supabase
          .from('project_views')
          .insert({
            project_id: projectId,
            user_id: user.id,
            viewed_at: new Date().toISOString()
          })
      }
    }

    // Check if user has liked/bookmarked this project
    let isLiked = false
    let isBookmarked = false
    
    if (user) {
      const [likeResult, bookmarkResult] = await Promise.all([
        supabase
          .from('project_likes')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('project_bookmarks')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .single()
      ])

      isLiked = !likeResult.error && !!likeResult.data
      isBookmarked = !bookmarkResult.error && !!bookmarkResult.data
    }

    // Transform the data
    const transformedProject = {
      id: project.id,
      name: project.name,
      tagline: project.tagline,
      description: project.description,
      longDescription: project.long_description,
      teamId: project.team_id,
      team: project.team ? {
        id: project.team.id,
        name: project.team.name,
        description: project.team.description,
        avatarUrl: project.team.avatar_url,
        createdBy: project.team.created_by
      } : null,
      createdBy: project.created_by,
      status: project.status,
      progress: project.progress,
      projectType: project.project_type,
      category: project.category || [],
      tags: project.tags || [],
      bannerImage: project.banner_image,
      logoImage: project.logo_image,
      screenshots: project.screenshots || [],
      videos: project.videos || [],
      demoImages: project.demo_images || [],
      githubUrl: project.github_url,
      demoUrl: project.demo_url,
      websiteUrl: project.website_url,
      docsUrl: project.docs_url,
      figmaUrl: project.figma_url,
      discordUrl: project.discord_url,
      twitterUrl: project.twitter_url,
      techStack: project.tech_stack || [],
      blockchain: project.blockchain || [],
      smartContracts: project.smart_contracts || {},
      githubStars: project.github_stars || 0,
      githubForks: project.github_forks || 0,
      websiteVisits: project.website_visits || 0,
      demoInteractions: project.demo_interactions || 0,
      startDate: project.start_date,
      endDate: project.end_date,
      launchDate: project.launch_date,
      lastUpdatedAt: project.last_updated_at,
      isPublic: project.is_public,
      isFeatured: project.is_featured,
      featuredPriority: project.featured_priority,
      viewsCount: project.views_count || 0,
      likesCount: project.likes_count || 0,
      bookmarksCount: project.bookmarks_count || 0,
      contributors: project.contributors?.map((c: any) => ({
        id: c.id,
        projectId: project.id,
        userId: c.user_id,
        user: c.user,
        role: c.role,
        contributionDescription: c.contribution_description,
        hoursContributed: c.hours_contributed || 0,
        isActive: c.is_active,
        joinedAt: c.joined_at
      })) || [],
      updates: project.updates?.map((u: any) => ({
        id: u.id,
        projectId: project.id,
        title: u.title,
        content: u.content,
        updateType: u.update_type,
        version: u.version,
        images: u.images || [],
        createdBy: u.created_by,
        createdAt: u.created_at,
        author: u.author
      })) || [],
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      
      // User interaction state
      isLiked,
      isBookmarked
    }

    return NextResponse.json({
      success: true,
      data: transformedProject
    })

  } catch (error) {
    console.error("Get project error:", error)
    return NextResponse.json(
      { error: "Failed to get project" },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const projectId = params.id
    const body = await request.json()

    // Check if user has permission to update this project
    const { data: project } = await supabase
      .from('projects')
      .select('team_id, created_by')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check if user is project creator or team leader/co-leader
    const isCreator = project.created_by === user.id
    let isTeamLeader = false

    if (project.team_id) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', project.team_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      isTeamLeader = !!(membership && ['leader', 'co_leader', 'pm'].includes(membership.role))
    }

    if (!isCreator && !isTeamLeader) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Update the project
    const updateData: any = {}
    const allowedFields = [
      'name', 'tagline', 'description', 'long_description', 'status', 'progress',
      'project_type', 'category', 'tags', 'banner_image', 'logo_image',
      'screenshots', 'videos', 'demo_images', 'github_url', 'demo_url',
      'website_url', 'docs_url', 'figma_url', 'discord_url', 'twitter_url',
      'tech_stack', 'blockchain', 'smart_contracts', 'start_date', 'end_date',
      'launch_date', 'is_public'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Convert camelCase to snake_case for database
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase()
        updateData[dbField] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    updateData.last_updated_at = new Date().toISOString()

    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single()

    if (updateError) {
      console.error("Project update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: updatedProject
    })

  } catch (error) {
    console.error("Update project error:", error)
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const projectId = params.id

    // Check if user has permission to delete this project
    const { data: project } = await supabase
      .from('projects')
      .select('team_id, created_by')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Only project creator or team leader can delete
    const isCreator = project.created_by === user.id
    let isTeamLeader = false

    if (project.team_id) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', project.team_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      isTeamLeader = !!(membership && membership.role === 'leader')
    }

    if (!isCreator && !isTeamLeader) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Delete the project (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (deleteError) {
      console.error("Project deletion error:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: { message: "Project deleted successfully" }
    })

  } catch (error) {
    console.error("Delete project error:", error)
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    )
  }
}

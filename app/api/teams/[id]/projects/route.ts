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
  if (!supabase || !access || !refresh) return { supabase: null, user: null }
  
  await supabase.auth.setSession({ access_token: access, refresh_token: refresh })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { supabase: null, user: null }
  
  return { supabase, user }
}

// GET /api/teams/[id]/projects - Get team projects
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teamId = params.id

    // Check if user is a team member
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get team projects with contributors
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        contributors:project_contributors(
          id,
          user_id,
          role,
          contribution_description,
          hours_contributed,
          is_active,
          joined_at,
          user:users(id, display_name, avatar_url)
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
      .eq('team_id', teamId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Get team projects error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Transform the data
    const transformedProjects = projects?.map(project => ({
      id: project.id,
      name: project.name,
      tagline: project.tagline,
      description: project.description,
      longDescription: project.long_description,
      teamId: project.team_id,
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
      updatedAt: project.updated_at
    })) || []

    return NextResponse.json({
      success: true,
      data: transformedProjects
    })

  } catch (error) {
    console.error("Get team projects error:", error)
    return NextResponse.json(
      { error: "Failed to get team projects" },
      { status: 500 }
    )
  }
}

// POST /api/teams/[id]/projects - Create new project
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teamId = params.id
    const body = await request.json()

    // Check if user is a team member with appropriate permissions
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership || !['leader', 'co_leader', 'pm'].includes(membership.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Create the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: body.name,
        tagline: body.tagline || null,
        description: body.description || null,
        long_description: body.longDescription || null,
        team_id: teamId,
        created_by: user.id,
        status: body.status || 'planning',
        progress: body.progress || 0,
        project_type: body.projectType || null,
        category: body.category || [],
        tags: body.tags || [],
        banner_image: body.bannerImage || null,
        logo_image: body.logoImage || null,
        screenshots: body.screenshots || [],
        videos: body.videos || [],
        demo_images: body.demoImages || [],
        github_url: body.githubUrl || null,
        demo_url: body.demoUrl || null,
        website_url: body.websiteUrl || null,
        docs_url: body.docsUrl || null,
        figma_url: body.figmaUrl || null,
        discord_url: body.discordUrl || null,
        twitter_url: body.twitterUrl || null,
        tech_stack: body.techStack || [],
        blockchain: body.blockchain || [],
        smart_contracts: body.smartContracts || {},
        start_date: body.startDate || null,
        end_date: body.endDate || null,
        launch_date: body.launchDate || null,
        is_public: true,
        is_featured: false,
        featured_priority: 0
      })
      .select()
      .single()

    if (projectError) {
      console.error("Project creation error:", projectError)
      return NextResponse.json({ error: projectError.message }, { status: 400 })
    }

    // Add creator as project lead
    const { error: contributorError } = await supabase
      .from('project_contributors')
      .insert({
        project_id: project.id,
        user_id: user.id,
        role: 'lead',
        contribution_description: 'Project creator and lead',
        hours_contributed: 0,
        is_active: true
      })

    if (contributorError) {
      console.error("Contributor creation error:", contributorError)
      // Don't fail the whole operation, just log the error
    }

    // Award XP for creating project
    awardXp(user.id, XP_VALUES.CREATE_PROJECT, "Created project", { 
      projectId: project.id,
      projectName: project.name,
      teamId
    }).catch(() => {
      // Silently fail - XP will be handled by background processes
    });

    // Check if it's user's first project and award bonus
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', user.id)

    if (count === 1) {
      awardXp(user.id, XP_VALUES.FIRST_PROJECT, "First project created", {
        projectId: project.id
      }).catch(() => {
        // Silently fail - XP will be handled by background processes
      });
    }

    // Transform and return the created project
    const transformedProject = {
      id: project.id,
      name: project.name,
      tagline: project.tagline,
      description: project.description,
      longDescription: project.long_description,
      teamId: project.team_id,
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
      contributors: [],
      updates: [],
      createdAt: project.created_at,
      updatedAt: project.updated_at
    }

    return NextResponse.json({
      success: true,
      data: transformedProject
    })

  } catch (error) {
    console.error("Create project error:", error)
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    )
  }
}

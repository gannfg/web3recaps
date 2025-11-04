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

// GET /api/projects - Get public projects with filtering
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await getAuthedClient(request)
    if (!supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Filtering
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const projectType = searchParams.get('projectType')
    const category = searchParams.get('category')
    const techStack = searchParams.get('techStack')?.split(',') || []
    const blockchain = searchParams.get('blockchain')?.split(',') || []
    const featured = searchParams.get('featured') === 'true'
    
    // Sorting
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Valid sort fields
    const validSortFields = ['created_at', 'updated_at', 'views_count', 'likes_count', 'name', 'launch_date']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    const ascending = sortOrder === 'asc'

    // Build base query
    let query = supabase
      .from('projects')
      .select(`
        *,
        team:teams(
          id,
          name,
          avatar_url
        ),
        contributors:project_contributors(
          id,
          user_id,
          role,
          user:users(id, display_name, avatar_url)
        )
      `)
      .eq('is_public', true)
      .order(sortField, { ascending })

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,tagline.ilike.%${search}%`)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (projectType && projectType !== 'all') {
      query = query.eq('project_type', projectType)
    }

    if (category && category !== 'all') {
      query = query.contains('category', [category])
    }

    if (techStack.length > 0) {
      query = query.overlaps('tech_stack', techStack)
    }

    if (blockchain.length > 0) {
      query = query.overlaps('blockchain', blockchain)
    }

    if (featured) {
      query = query.eq('is_featured', true)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: projects, error } = await query

    if (error) {
      console.error("Get projects error:", error)
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
      team: project.team ? {
        id: project.team.id,
        name: project.team.name,
        avatarUrl: project.team.avatar_url
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
        role: c.role
      })) || [],
      createdAt: project.created_at,
      updatedAt: project.updated_at
    })) || []

    // Get total count for pagination
    let countQuery = supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true)

    // Apply same filters to count query
    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%,tagline.ilike.%${search}%`)
    }
    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }
    if (projectType && projectType !== 'all') {
      countQuery = countQuery.eq('project_type', projectType)
    }
    if (category && category !== 'all') {
      countQuery = countQuery.contains('category', [category])
    }
    if (techStack.length > 0) {
      countQuery = countQuery.overlaps('tech_stack', techStack)
    }
    if (blockchain.length > 0) {
      countQuery = countQuery.overlaps('blockchain', blockchain)
    }
    if (featured) {
      countQuery = countQuery.eq('is_featured', true)
    }

    const { count } = await countQuery

    // Get aggregated stats
    const { data: statsData } = await supabase
      .from('projects')
      .select('status, project_type, is_featured')
      .eq('is_public', true)

    const stats = {
      total: count || 0,
      published: statsData?.filter(p => p.status === 'published').length || 0,
      inProgress: statsData?.filter(p => p.status === 'in_progress').length || 0,
      featured: statsData?.filter(p => p.is_featured).length || 0,
      webApps: statsData?.filter(p => p.project_type === 'web_app').length || 0,
      defi: statsData?.filter(p => p.project_type === 'defi').length || 0,
      games: statsData?.filter(p => p.project_type === 'game').length || 0
    }

    return NextResponse.json({
      success: true,
      data: {
        projects: transformedProjects,
        stats,
        hasMore: transformedProjects.length === limit,
        total: count || 0
      }
    })

  } catch (error) {
    console.error("Get projects error:", error)
    return NextResponse.json(
      { error: "Failed to get projects" },
      { status: 500 }
    )
  }
}

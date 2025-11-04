import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { awardXp } from "@/lib/gamification"
import { XP_VALUES } from "@/lib/types"
import { checkAndRecordAction } from '@/lib/rate-limiting';
import { createNotification } from '@/lib/notification-service';

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

// POST /api/projects/[id]/like - Like a project
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const projectId = params.id

    // Check if project exists and is public
    const { data: project } = await supabase
      .from('projects')
      .select('id, is_public, created_by, title')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (!project.is_public) {
      return NextResponse.json({ error: "Project is not public" }, { status: 403 })
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('project_likes')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (existingLike) {
      return NextResponse.json({ error: "Project already liked" }, { status: 400 })
    }

    // Check rate limit for liking projects
    const rateLimitResult = await checkAndRecordAction(user.id, 'like_project', {
      cooldownMs: 1000, // 1 second cooldown
      dailyLimit: 75     // 75 project likes per day
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json({ 
        error: rateLimitResult.reason,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime
      }, { status: 429 });
    }

    // Create like
    const { error: likeError } = await supabase
      .from('project_likes')
      .insert({
        project_id: projectId,
        user_id: user.id
      })

    if (likeError) {
      console.error("Like creation error:", likeError)
      return NextResponse.json({ error: likeError.message }, { status: 400 })
    }

    // Award XP for liking the project
    awardXp(user.id, XP_VALUES.LIKE_PROJECT, "Liked project", { projectId }).catch(() => {
      // Silently fail - XP will be handled by background processes
    });

    // Notify project creator about the like
    if (project.created_by !== user.id) {
      createNotification({
        userId: project.created_by,
        type: 'project_like',
        title: 'New like on your project',
        message: `Someone liked your project "${project.title}"`,
        actionUrl: `/projects/${projectId}`,
        actorId: user.id,
        entityType: 'project',
        entityId: projectId
      }).catch(() => {
        // Silently fail - notifications are not critical
      });
    }

    return NextResponse.json({
      success: true,
      data: { message: "Project liked successfully" }
    })

  } catch (error) {
    console.error("Like project error:", error)
    return NextResponse.json(
      { error: "Failed to like project" },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id]/like - Unlike a project
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

    // Remove like
    const { error: unlikeError } = await supabase
      .from('project_likes')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user.id)

    if (unlikeError) {
      console.error("Unlike error:", unlikeError)
      return NextResponse.json({ error: unlikeError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: { message: "Project unliked successfully" }
    })

  } catch (error) {
    console.error("Unlike project error:", error)
    return NextResponse.json(
      { error: "Failed to unlike project" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { awardXp } from "@/lib/gamification"
import { XP_VALUES } from "@/lib/types"
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

// POST /api/projects/[id]/bookmark - Bookmark a project
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

    // Check if already bookmarked
    const { data: existingBookmark } = await supabase
      .from('project_bookmarks')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (existingBookmark) {
      return NextResponse.json({ error: "Project already bookmarked" }, { status: 400 })
    }

    // Create bookmark
    const { error: bookmarkError } = await supabase
      .from('project_bookmarks')
      .insert({
        project_id: projectId,
        user_id: user.id
      })

    if (bookmarkError) {
      console.error("Bookmark creation error:", bookmarkError)
      return NextResponse.json({ error: bookmarkError.message }, { status: 400 })
    }

    // Award XP for bookmarking the project
    awardXp(user.id, XP_VALUES.BOOKMARK_PROJECT, "Bookmarked project", { projectId }).catch(() => {
      // Silently fail - XP will be handled by background processes
    });

    // Notify project creator about the bookmark
    if (project.created_by !== user.id) {
      createNotification({
        userId: project.created_by,
        type: 'project_bookmark',
        title: 'New bookmark on your project',
        message: `Someone bookmarked your project "${project.title}"`,
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
      data: { message: "Project bookmarked successfully" }
    })

  } catch (error) {
    console.error("Bookmark project error:", error)
    return NextResponse.json(
      { error: "Failed to bookmark project" },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id]/bookmark - Remove bookmark from project
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

    // Remove bookmark
    const { error: removeError } = await supabase
      .from('project_bookmarks')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user.id)

    if (removeError) {
      console.error("Remove bookmark error:", removeError)
      return NextResponse.json({ error: removeError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: { message: "Bookmark removed successfully" }
    })

  } catch (error) {
    console.error("Remove bookmark error:", error)
    return NextResponse.json(
      { error: "Failed to remove bookmark" },
      { status: 500 }
    )
  }
}

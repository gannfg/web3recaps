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
  const { data: userRes, error } = await supabase.auth.getUser()
  if (error || !userRes.user) return { supabase: null, user: null }

  return { supabase, user: userRes.user }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("project_contributors")
      .select(
        `
        project:projects(
          id,
          name,
          tagline,
          status,
          project_type,
          logo_image,
          banner_image,
          team_id
        ),
        role,
        is_active,
        joined_at
      `
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("joined_at", { ascending: false })

    if (error) {
      console.error("Failed to load user projects:", error)
      return NextResponse.json({ error: "Failed to load projects" }, { status: 500 })
    }

    const projects =
      data
        ?.filter((row: any) => row.project)
        .map((row: any) => ({
          id: row.project.id,
          name: row.project.name,
          tagline: row.project.tagline,
          status: row.project.status,
          projectType: row.project.project_type,
          logoImage: row.project.logo_image,
          bannerImage: row.project.banner_image,
          teamId: row.project.team_id,
          role: row.role,
          joinedAt: row.joined_at
        })) ?? []

    return NextResponse.json({ success: true, data: projects })
  } catch (error) {
    console.error("Projects mine GET error:", error)
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 })
  }
}


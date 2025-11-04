import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"

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

// GET /api/users/me/invitations - Get user's team invitations
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await getAuthedClient(request)
    if (!supabase) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const userId = userRes.user.id

    // Get invitations where user is the invitee (by email or user ID)
    const { data: invitations, error } = await supabase
      .from('team_invitations')
      .select(`
        *,
        team:teams!team_invitations_team_id_fkey(
          id,
          name,
          description,
          avatar_url,
          created_by
        ),
        inviter:users!team_invitations_inviter_id_fkey(
          id,
          display_name,
          avatar_url
        )
      `)
      .or(`invitee_id.eq.${userId},invitee_email.eq.${userRes.user.email}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Get user invitations error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: invitations || []
    })

  } catch (error) {
    console.error("Get user invitations error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
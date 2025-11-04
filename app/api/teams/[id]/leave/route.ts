import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"

const ACCESS_COOKIE = "sb-access-token"
const REFRESH_COOKIE = "sb-refresh-token"

async function getAuthedClient(request: NextRequest) {
  const auth = await requireUser(request)
  if (!auth.supabase || !auth.user) return { supabase: null, user: null }
  return { supabase: auth.supabase, user: auth.user }
}

// POST /api/teams/[id]/leave - Leave team
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const userId = user.id

    const teamId = params.id

    // Check if team exists
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id, created_by')
      .eq('id', teamId)
      .single()

    if (teamError || !teamData) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    // Check if user is a member
    const { data: memberData, error: memberError } = await supabase
      .from('team_members')
      .select('id, role, is_active')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (memberError || !memberData) {
      return NextResponse.json({ error: "You are not a member of this team" }, { status: 400 })
    }

    if (!memberData.is_active) {
      return NextResponse.json({ error: "You are not an active member of this team" }, { status: 400 })
    }

    // Prevent team leader from leaving (they must transfer leadership first)
    if (memberData.role === 'leader' || teamData.created_by === userId) {
      return NextResponse.json({ 
        error: "Team leaders cannot leave the team. Please transfer leadership first or delete the team." 
      }, { status: 400 })
    }

    // Remove user from team (soft delete)
    const { error: leaveError } = await supabase
      .from('team_members')
      .update({ is_active: false })
      .eq('id', memberData.id)

    if (leaveError) {
      console.error("Leave team error:", leaveError)
      return NextResponse.json({ error: "Failed to leave team" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Successfully left the team",
    })
  } catch (error) {
    console.error("Leave team error:", error)
    return NextResponse.json(
      { error: "Failed to leave team" },
      { status: 500 }
    )
  }
}
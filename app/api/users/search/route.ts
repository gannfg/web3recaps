import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Search users by display_name, email, or wallet_address
    const { data: users, error } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, email, wallet_address, bio, skills')
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%,wallet_address.ilike.%${query}%`)
      .limit(limit)

    if (error) {
      console.error("Error searching users:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Map database field names to frontend field names
    const mappedUsers = (users || []).map(user => ({
      id: user.id,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      email: user.email,
      walletAddress: user.wallet_address,
      bio: user.bio,
      skills: user.skills
    }))

    return NextResponse.json({
      success: true,
      data: mappedUsers
    })

  } catch (error) {
    console.error("Error in user search:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

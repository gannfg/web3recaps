import { type NextRequest, NextResponse } from "next/server"
import type { ApiResponse, User } from "@/lib/types"
import { createSupabaseServer } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    
    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, display_name, bio, skills, role, total_xp, rank, level, social_links, avatar_url, created_at")
      .eq("id", id)
      .single()

    if (error || !user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Return public user data (exclude sensitive info)
    const publicUser: Partial<User> = {
      id: user.id,
      displayName: user.display_name,
      bio: user.bio,
      skills: user.skills || [],
      role: user.role,
      totalXp: user.total_xp || 0,
      rank: user.rank,
      level: user.level || 1,
      avatarUrl: user.avatar_url,
      socialLinks: user.social_links || {},
      createdAt: user.created_at,
    }

    const response: ApiResponse<Partial<User>> = {
      success: true,
      data: publicUser,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Get user by ID error:", error)
    return NextResponse.json({ success: false, error: "Failed to get user" }, { status: 500 })
  }
}

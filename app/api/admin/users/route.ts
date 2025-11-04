import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const role = searchParams.get("role") || ""

    let query = supabase
      .from("users")
      .select("id, display_name, email, role, total_xp, created_at, last_seen, avatar_url")
      .order("created_at", { ascending: false })

    // Apply search filter
    if (search) {
      query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply role filter
    if (role) {
      query = query.eq("role", role)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: users, error, count } = await query

    if (error) {
      console.error("Error fetching users:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        users: users || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      }
    })

  } catch (error) {
    console.error("Error in GET /api/admin/users:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

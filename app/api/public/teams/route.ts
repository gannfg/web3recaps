import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdmin } from "@/lib/supabase/server"

export const revalidate = 120

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase admin client is not configured." },
        { status: 500 },
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "12", 10), 24)

    const { data, error } = await supabase
      .from("teams")
      .select(
        `
        id,
        name,
        description,
        avatar_url,
        project_type,
        status,
        location,
        tags,
        skills,
        max_members,
        team_level,
        total_xp,
        created_at,
        team_members(count)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[public teams] supabase error:", error)
      return NextResponse.json(
        { success: false, error: "Unable to fetch teams" },
        { status: 500 },
      )
    }

    const payload = (data || []).map((team: any) => {
      const memberAggregate = team.team_members
      let memberCount: number | null = null

      if (Array.isArray(memberAggregate)) {
        memberCount = memberAggregate.reduce((total, row) => {
          if (row && typeof row.count === "number") {
            return total + row.count
          }
          return total
        }, 0)
      } else if (memberAggregate && typeof memberAggregate.count === "number") {
        memberCount = memberAggregate.count
      }

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        avatarUrl: team.avatar_url,
        projectType: team.project_type,
        status: team.status,
        location: team.location,
        skills: team.skills || [],
        maxMembers: team.max_members || null,
        teamLevel: team.team_level || 1,
        totalXp: team.total_xp || 0,
        createdAt: team.created_at,
        tags: team.tags || [],
        currentMemberCount: memberCount,
      }
    })

    return NextResponse.json({ success: true, data: payload })
  } catch (error) {
    console.error("[public teams] request error:", error)
    return NextResponse.json(
      { success: false, error: "Unexpected error fetching teams" },
      { status: 500 },
    )
  }
}


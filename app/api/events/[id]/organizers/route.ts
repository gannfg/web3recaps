import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import type { ApiResponse, EventOrganizer } from "@/lib/types"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    if (!eventId) {
      return NextResponse.json({ success: false, error: "Event ID is required" }, { status: 400 })
    }

    // Use regular client for reading organizers
    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    // Get event organizers
    const { data: organizers, error } = await supabase
      .from("event_organizers")
      .select(`
        id,
        event_id,
        organizer_type,
        organizer_id,
        role,
        added_at,
        added_by
      `)
      .eq("event_id", eventId)
      .order("added_at", { ascending: true })

    if (error) {
      console.error("Error fetching event organizers:", error)
      return NextResponse.json({ success: false, error: "Failed to fetch organizers" }, { status: 500 })
    }

    // Get user and team data separately
    const userIds = organizers?.filter(org => org.organizer_type === "user").map(org => org.organizer_id) || []
    const teamIds = organizers?.filter(org => org.organizer_type === "team").map(org => org.organizer_id) || []

    let users: any[] = []
    let teams: any[] = []

    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from("users")
        .select("id, display_name, avatar_url, role")
        .in("id", userIds)
      users = usersData || []
    }

    if (teamIds.length > 0) {
      const { data: teamsData } = await supabase
        .from("teams")
        .select(`
          id,
          name,
          avatar_url,
          description,
          team_members!inner(
            user_id,
            role,
            is_active
          )
        `)
        .in("id", teamIds)
      teams = teamsData || []
    }

    // Transform the data to match our interface
    const formattedOrganizers = organizers?.map(org => {
      const user = org.organizer_type === "user" ? users.find(u => u.id === org.organizer_id) : undefined
      const team = org.organizer_type === "team" ? teams.find(t => t.id === org.organizer_id) : undefined
      
      return {
        id: org.id,
        eventId: org.event_id,
        organizerType: org.organizer_type,
        organizerId: org.organizer_id,
        role: org.role,
        addedAt: org.added_at,
        addedBy: org.added_by,
        user,
        team: team ? {
          ...team,
          members: team.team_members || []
        } : undefined,
      }
    }) || []

    const response: ApiResponse<EventOrganizer[]> = {
      success: true,
      data: formattedOrganizers,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in organizers API:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

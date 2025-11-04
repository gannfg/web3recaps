import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    // First check if the user is the creator of this event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('creator_id')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
    }

    if (event.creator_id !== userId) {
      return NextResponse.json({ success: false, error: "Unauthorized to view attendees" }, { status: 403 })
    }

    // Get all bookings for this event with user details
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        attendee_id,
        status,
        booked_at,
        checked_in,
        checked_in_at,
        xp_awarded,
        waitlist_position,
        users!bookings_attendee_id_fkey (
          id,
          display_name,
          email,
          avatar_url
        )
      `)
      .eq('event_id', eventId)
      .order('booked_at', { ascending: false })

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json({ success: false, error: "Failed to fetch attendees" }, { status: 500 })
    }

    const attendees = bookings?.map((booking: any) => ({
      id: booking.id,
      name: booking.users?.display_name || "Anonymous",
      email: booking.users?.email || "",
      avatar: booking.users?.avatar_url,
      status: booking.status,
      bookedAt: booking.booked_at,
      checkedIn: booking.checked_in,
      checkedInAt: booking.checked_in_at,
      xpAwarded: booking.xp_awarded,
      waitlistPosition: booking.waitlist_position,
    })) || []

    return NextResponse.json({ 
      success: true, 
      data: { 
        attendees,
        total: attendees.length,
        confirmed: attendees.filter(a => a.status === 'confirmed').length,
        waitlisted: attendees.filter(a => a.status === 'waitlisted').length,
        checkedIn: attendees.filter(a => a.checkedIn).length,
      }
    })

  } catch (error) {
    console.error("Get attendees error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to get attendees" },
      { status: 500 }
    )
  }
}

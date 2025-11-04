import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    // Get user's bookings with event details
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        event_id,
        attendee_id,
        status,
        booked_at,
        checked_in,
        checked_in_at,
        xp_awarded,
        waitlist_position,
        events (
          id,
          title,
          description,
          event_date,
          start_time,
          end_time,
          event_type,
          location,
          max_attendees,
          current_attendees_count,
          is_public,
          xp_reward,
          skill_level,
          tags,
          status
        )
      `)
      .eq('attendee_id', userId)
      .order('booked_at', { ascending: false })

    if (error) {
      console.error('Error fetching bookings:', error)
      return NextResponse.json({ success: false, error: "Failed to fetch bookings" }, { status: 500 })
    }

    const formattedBookings = bookings?.map((booking: any) => ({
      id: booking.id,
      eventId: booking.event_id,
      userId: booking.attendee_id,
      status: booking.status,
      bookedAt: booking.booked_at,
      checkedIn: booking.checked_in,
      checkedInAt: booking.checked_in_at,
      xpAwarded: booking.xp_awarded,
      waitlistPosition: booking.waitlist_position,
      event: booking.events ? {
        id: booking.events.id,
        title: booking.events.title,
        description: booking.events.description,
        eventDate: booking.events.event_date,
        startTime: booking.events.start_time,
        endTime: booking.events.end_time,
        eventType: booking.events.event_type,
        location: booking.events.location,
        maxAttendees: booking.events.max_attendees,
        currentAttendeesCount: booking.events.current_attendees_count,
        isPublic: booking.events.is_public,
        xpReward: booking.events.xp_reward,
        skillLevel: booking.events.skill_level,
        tags: booking.events.tags,
        status: booking.events.status,
      } : null
    })) || []

    return NextResponse.json({ 
      success: true, 
      data: formattedBookings 
    })

  } catch (error) {
    console.error("Get bookings error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to get bookings" },
      { status: 500 }
    )
  }
}

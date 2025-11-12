import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"

// Returns the current user's booking for the specified event, if any
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

    const { data: booking } = await auth.supabase
      .from('bookings')
      .select('id, event_id, attendee_id, status, booked_at, checked_in, checked_in_at, xp_awarded, waitlist_position, notes')
      .eq('event_id', eventId)
      .eq('attendee_id', userId)
      .single()

    if (!booking) {
      return NextResponse.json({ success: true, data: { booking: null } })
    }

    return NextResponse.json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          eventId: booking.event_id,
          userId: booking.attendee_id,
          status: booking.status,
          bookedAt: booking.booked_at,
          checkedIn: booking.checked_in,
          checkedInAt: booking.checked_in_at,
          xpAwarded: booking.xp_awarded,
          waitlistPosition: booking.waitlist_position,
          notes: booking.notes,
        }
      }
    })
  } catch (error) {
    console.error("Get booking error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to get booking" },
      { status: 500 }
    )
  }
}



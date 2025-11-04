import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"
import { z } from "zod"
import { awardXp } from "@/lib/gamification"
import { XP_VALUES } from "@/lib/types"

const checkInSchema = z.object({
  attendeeId: z.string().uuid(),
  qrCode: z.string().optional(),
})

export async function POST(
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

    const body = await request.json()
    const { attendeeId, qrCode } = checkInSchema.parse(body)

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    // Check if the user is the creator of this event or has admin privileges
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('creator_id, check_in_code, xp_reward, title')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
    }

    // For now, only allow event creators to check in attendees
    // In a real app, you might want to allow designated staff members
    if (event.creator_id !== userId) {
      return NextResponse.json({ success: false, error: "Unauthorized to check in attendees" }, { status: 403 })
    }

    // Get the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status, checked_in, attendee_id, xp_awarded')
      .eq('event_id', eventId)
      .eq('attendee_id', attendeeId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 })
    }

    if (booking.status !== 'confirmed') {
      return NextResponse.json({ 
        success: false, 
        error: "Only confirmed attendees can be checked in" 
      }, { status: 400 })
    }

    if (booking.checked_in) {
      return NextResponse.json({ 
        success: false, 
        error: "Attendee is already checked in" 
      }, { status: 400 })
    }

    // Update the booking to mark as checked in
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        status: 'attended',
      })
      .eq('id', booking.id)

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json({ success: false, error: "Failed to check in attendee" }, { status: 500 })
    }

    // Award XP to the attendee if not already awarded
    if (event.xp_reward > 0 && !booking.xp_awarded) {
      // Award XP using the proper gamification system
      const xpResult = await awardXp(attendeeId, event.xp_reward, "Event check-in", {
        eventId,
        eventTitle: event.title,
        checkInTime: new Date().toISOString()
      });

      if (xpResult.success) {
        // Mark XP as awarded in the booking
        await supabase
          .from('bookings')
          .update({ xp_awarded: true })
          .eq('id', booking.id)
      }
    } else if (!event.xp_reward || event.xp_reward === 0) {
      // Award default XP for event check-in
      const xpResult = await awardXp(attendeeId, XP_VALUES.EVENT_CHECKIN, "Event check-in", {
        eventId,
        eventTitle: event.title,
        checkInTime: new Date().toISOString()
      });

      if (xpResult.success) {
        // Mark XP as awarded in the booking
        await supabase
          .from('bookings')
          .update({ xp_awarded: true })
          .eq('id', booking.id)
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        checkedIn: true,
        checkedInAt: new Date().toISOString(),
        xpAwarded: event.xp_reward > 0,
      }
    })

  } catch (error) {
    console.error("Check-in error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to check in attendee" },
      { status: 500 }
    )
  }
}

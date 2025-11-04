import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"
import { z } from "zod"
import { awardXp } from "@/lib/gamification"
import { XP_VALUES } from "@/lib/types"
import { scheduleEventReminders } from "@/lib/email-scheduler"
import { createNotification } from "@/lib/notification-service"

const bookEventSchema = z.object({
  notes: z.string().optional(),
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
    const { notes } = bookEventSchema.parse(body)

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, max_attendees, current_attendees_count, capacity_type, status, waitlist_count, event_date, start_time')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
    }

    if (event.status !== 'published') {
      return NextResponse.json({ success: false, error: "Event is not available for booking" }, { status: 400 })
    }

    // Check if user already has a booking
    const { data: existingBooking } = await auth.supabase
      .from('bookings')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('attendee_id', userId)
      .single()

    if (existingBooking) {
      return NextResponse.json({ 
        success: false, 
        error: "You already have a booking for this event",
        data: { bookingId: existingBooking.id, status: existingBooking.status }
      }, { status: 400 })
    }

    // Determine booking status based on capacity
    let bookingStatus = 'confirmed'
    let waitlistPosition = null

    if (event.capacity_type === 'limited') {
      if (event.current_attendees_count >= event.max_attendees) {
        bookingStatus = 'waitlisted'
        // Get current waitlist count
        const { count: waitlistCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact' })
          .eq('event_id', eventId)
          .eq('status', 'waitlisted')
        
        waitlistPosition = (waitlistCount || 0) + 1
      }
    }

    // Create booking
    const { data: booking, error: bookingError } = await auth.supabase
      .from('bookings')
      .insert({
        event_id: eventId,
        attendee_id: userId,
        status: bookingStatus,
        booked_at: new Date().toISOString(),
        checked_in: false,
        xp_awarded: false,
        waitlist_position: waitlistPosition,
        notes: notes,
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
      return NextResponse.json({ success: false, error: "Failed to create booking" }, { status: 500 })
    }

    // Update event attendance count
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (bookingStatus === 'confirmed') {
      updateData.current_attendees_count = event.current_attendees_count + 1
    } else {
      updateData.waitlist_count = (event.waitlist_count || 0) + 1
    }

    const { error: updateError } = await auth.supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)

    if (updateError) {
      console.error('Error updating event attendance:', updateError)
      // Don't fail the booking, just log the error
    }

    // Award XP for booking the event (only if confirmed, not waitlisted)
    if (bookingStatus === 'confirmed') {
      awardXp(userId, XP_VALUES.ATTEND_EVENT, "Booked event", { 
        eventId,
        eventTitle: event.title
      }).catch(() => {
        // Silently fail - XP will be handled by background processes
      });

      // Create booking confirmation notification
      createNotification({
        userId: userId,
        type: 'event_booking_confirmed',
        title: 'Event Booking Confirmed',
        message: `You've successfully booked "${event.title}"`,
        actionUrl: `/events/${eventId}`,
        entityType: 'event',
        entityId: eventId
      }).catch(() => {
        // Silently fail - notifications are not critical
      });

      // Schedule email reminders (24h and 6h before event)
      const eventDate = new Date(`${event.event_date}T${event.start_time}`);
      scheduleEventReminders(eventId, eventDate, [userId]).catch(() => {
        // Silently fail - reminders are not critical
      });
    } else if (bookingStatus === 'waitlisted') {
      // Create waitlist notification
      createNotification({
        userId: userId,
        type: 'event_waitlist_spot',
        title: 'Added to Event Waitlist',
        message: `You've been added to the waitlist for "${event.title}" (Position: ${waitlistPosition})`,
        actionUrl: `/events/${eventId}`,
        entityType: 'event',
        entityId: eventId
      }).catch(() => {
        // Silently fail - notifications are not critical
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        id: booking.id,
        eventId: booking.event_id,
        userId: booking.attendee_id,
        status: booking.status,
        bookedAt: booking.booked_at,
        checkedIn: booking.checked_in,
        xpAwarded: booking.xp_awarded,
        waitlistPosition: booking.waitlist_position,
        notes: booking.notes,
      }
    })

  } catch (error) {
    console.error("Book event error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to book event" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    // Get the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status, waitlist_position')
      .eq('event_id', eventId)
      .eq('attendee_id', userId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 })
    }

    // Delete the booking
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', booking.id)

    if (deleteError) {
      console.error('Error deleting booking:', deleteError)
      return NextResponse.json({ success: false, error: "Failed to cancel booking" }, { status: 500 })
    }

    // Update event attendance count
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (booking.status === 'confirmed') {
      // Decrease confirmed attendees
      const { data: event } = await supabase
        .from('events')
        .select('current_attendees_count')
        .eq('id', eventId)
        .single()

      updateData.current_attendees_count = Math.max((event?.current_attendees_count || 0) - 1, 0)
    } else if (booking.status === 'waitlisted') {
      // Decrease waitlist count
      const { data: event } = await supabase
        .from('events')
        .select('waitlist_count')
        .eq('id', eventId)
        .single()

      updateData.waitlist_count = Math.max((event?.waitlist_count || 0) - 1, 0)
    }

    const { error: updateError } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)

    if (updateError) {
      console.error('Error updating event attendance:', updateError)
      // Don't fail the cancellation, just log the error
    }

    return NextResponse.json({ success: true, data: { cancelled: true } })

  } catch (error) {
    console.error("Cancel booking error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to cancel booking" },
      { status: 500 }
    )
  }
}

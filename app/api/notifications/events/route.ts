import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { sendEventNotification, sendBulkEventNotification } from "@/lib/email-service"
import { z } from "zod"

const sendNotificationSchema = z.object({
  type: z.enum(['reminder', 'confirmation', 'waitlist', 'cancelled', 'checkin']),
  eventId: z.string().uuid(),
  recipientIds: z.array(z.string().uuid()).optional(),
  sendToAll: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }
    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = userRes.user.id

    const body = await request.json()
    const { type, eventId, recipientIds, sendToAll } = sendNotificationSchema.parse(body)

    // Reuse existing supabase client

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        event_date,
        start_time,
        end_time,
        location,
        creator_id,
        check_in_code,
        users!events_creator_id_fkey (
          id,
          display_name,
          email
        )
      `)
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
    }

    // Check if user is the event creator
    if (event.creator_id !== userId) {
      return NextResponse.json({ success: false, error: "Unauthorized to send notifications" }, { status: 403 })
    }

    // Get recipients
    let recipients: any[] = []

    if (sendToAll) {
      // Get all attendees for this event
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          attendee_id,
          status,
          waitlist_position,
          users!bookings_attendee_id_fkey (
            id,
            display_name,
            email
          )
        `)
        .eq('event_id', eventId)

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError)
        return NextResponse.json({ success: false, error: "Failed to fetch attendees" }, { status: 500 })
      }

      recipients = bookings?.map(booking => ({
        attendeeId: booking.attendee_id,
        attendeeName: (booking.users as any)?.display_name || "Attendee",
        attendeeEmail: (booking.users as any)?.email,
        waitlistPosition: booking.waitlist_position,
        status: booking.status,
      })) || []
    } else if (recipientIds && recipientIds.length > 0) {
      // Get specific recipients
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, email')
        .in('id', recipientIds)

      if (usersError) {
        console.error('Error fetching users:', usersError)
        return NextResponse.json({ success: false, error: "Failed to fetch recipients" }, { status: 500 })
      }

      recipients = users?.map(user => ({
        attendeeId: user.id,
        attendeeName: user.display_name || "Attendee",
        attendeeEmail: user.email,
      })) || []
    } else {
      return NextResponse.json({ success: false, error: "No recipients specified" }, { status: 400 })
    }

    // Prepare notification data
    const baseData = {
      eventTitle: event.title,
      eventDate: new Date(event.event_date).toLocaleDateString(),
      eventTime: `${event.start_time} - ${event.end_time}`,
      eventLocation: event.location,
      eventDescription: event.description,
      organizerName: (event.users as any)?.display_name || "Organizer",
      eventUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/${event.id}`,
      unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/unsubscribe`,
    }

    // Send notifications
    const notificationData = recipients.map(recipient => ({
      ...baseData,
      attendeeName: recipient.attendeeName,
      attendeeEmail: recipient.attendeeEmail,
      waitlistPosition: recipient.waitlistPosition,
      checkInCode: event.check_in_code,
    }))

    const result = await sendBulkEventNotification(type, notificationData)

    // Log notification in database
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: `event_${type}`,
        title: `Event ${type} notification sent`,
        message: `Sent ${type} notification to ${result.success} recipients for event "${event.title}"`,
        data: {
          event_id: eventId,
          recipients_count: recipients.length,
          success_count: result.success,
          failed_count: result.failed,
        },
      })

    return NextResponse.json({
      success: true,
      data: {
        sent: result.success,
        failed: result.failed,
        total: recipients.length,
      }
    })

  } catch (error) {
    console.error("Send notification error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to send notification" },
      { status: 500 }
    )
  }
}

// Get notification history for an event
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }
    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = userRes.user.id

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")

    

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .like('type', 'event_%')
      .order('created_at', { ascending: false })

    if (eventId) {
      query = query.eq('data->event_id', eventId)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ success: false, error: "Failed to fetch notifications" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: notifications || []
    })

  } catch (error) {
    console.error("Get notifications error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to get notifications" },
      { status: 500 }
    )
  }
}

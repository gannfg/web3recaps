import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth"
import { sendBulkEventNotification } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    // This endpoint should be called by a cron job or scheduled task
    const authHeader = request.headers.get("authorization")
    const expectedAuth = process.env.CRON_SECRET || "your-secret-key"
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    // Get events happening tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data: events, error: eventsError } = await supabase
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
      .eq('event_date', tomorrowStr)
      .eq('status', 'published')

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      return NextResponse.json({ success: false, error: "Failed to fetch events" }, { status: 500 })
    }

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        data: { message: "No events scheduled for tomorrow", processed: 0 }
      })
    }

    let totalProcessed = 0
    let totalSuccess = 0
    let totalFailed = 0

    // Process each event
    for (const event of events) {
      try {
        // Get all confirmed attendees for this event
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            attendee_id,
            status,
            users!bookings_attendee_id_fkey (
              id,
              display_name,
              email
            )
          `)
          .eq('event_id', event.id)
          .eq('status', 'confirmed')

        if (bookingsError) {
          console.error(`Error fetching bookings for event ${event.id}:`, bookingsError)
          continue
        }

        if (!bookings || bookings.length === 0) {
          continue
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

        const notificationData = bookings.map(booking => ({
          ...baseData,
          attendeeName: (booking.users as any)?.display_name || "Attendee",
          attendeeEmail: (booking.users as any)?.email,
          checkInCode: event.check_in_code,
        }))

        // Send reminder notifications
        const result = await sendBulkEventNotification('reminder', notificationData)
        
        totalProcessed += notificationData.length
        totalSuccess += result.success
        totalFailed += result.failed

        // Log the notification
        await supabase
          .from('notifications')
          .insert({
            user_id: event.creator_id,
            type: 'event_reminder_scheduled',
            title: 'Scheduled reminder sent',
            message: `Sent reminder to ${result.success} attendees for "${event.title}"`,
            data: {
              event_id: event.id,
              recipients_count: notificationData.length,
              success_count: result.success,
              failed_count: result.failed,
            },
          })

        console.log(`Processed event ${event.id}: ${result.success} sent, ${result.failed} failed`)

      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error)
        continue
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `Processed ${totalProcessed} notifications for ${events.length} events`,
        events_processed: events.length,
        notifications_sent: totalSuccess,
        notifications_failed: totalFailed,
        total_processed: totalProcessed,
      }
    })

  } catch (error) {
    console.error("Schedule notifications error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process scheduled notifications" },
      { status: 500 }
    )
  }
}

// Manual trigger for testing
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (!auth.supabase || !auth.user) {
      return NextResponse.json({ success: false, error: "User not authenticated" }, { status: 401 })
    }
    const userId = auth.user.id

    // Check if user is admin
    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase not configured" }, { status: 500 })
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError || !user || user.role !== 'Admin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    // Trigger the scheduled notification process
    const response = await POST(request)
    return response

  } catch (error) {
    console.error("Manual trigger error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to trigger notifications" },
      { status: 500 }
    )
  }
}

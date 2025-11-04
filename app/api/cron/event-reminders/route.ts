import { NextRequest, NextResponse } from "next/server"
import { getPendingReminders, sendEventReminder } from "@/lib/email-scheduler"

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job request (in production, add proper authentication)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('Running event reminders cron job...')

    // Get pending reminders
    const pendingReminders = await getPendingReminders()
    
    if (pendingReminders.length === 0) {
      console.log('No pending reminders found')
      return NextResponse.json({ 
        success: true, 
        message: "No pending reminders found",
        processed: 0
      })
    }

    console.log(`Found ${pendingReminders.length} pending reminders`)

    // Process each reminder
    const results = await Promise.allSettled(
      pendingReminders.map(async (reminder) => {
        console.log(`Processing ${reminder.hoursUntil}h reminder for event "${reminder.eventTitle}"`)
        return await sendEventReminder(reminder.eventId, reminder.hoursUntil)
      })
    )

    // Count successful and failed reminders
    const successful = results.filter(result => result.status === 'fulfilled' && result.value === true).length
    const failed = results.filter(result => result.status === 'rejected' || result.value === false).length

    console.log(`Event reminders processed: ${successful} successful, ${failed} failed`)

    return NextResponse.json({
      success: true,
      message: `Processed ${pendingReminders.length} reminders`,
      processed: pendingReminders.length,
      successful,
      failed
    })

  } catch (error) {
    console.error('Event reminders cron job error:', error)
    return NextResponse.json(
      { error: "Failed to process event reminders" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job request (in production, add proper authentication)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('Running notification cleanup cron job...')

    const supabase = createSupabaseServer()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    // Call the cleanup function
    const { data: deletedCount, error } = await supabase
      .rpc('cleanup_old_notifications')

    if (error) {
      console.error('Error cleaning up notifications:', error)
      return NextResponse.json({ error: "Failed to cleanup notifications" }, { status: 500 })
    }

    console.log(`Cleaned up ${deletedCount} old notifications`)

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} old notifications`,
      deletedCount
    })

  } catch (error) {
    console.error('Notification cleanup cron job error:', error)
    return NextResponse.json(
      { error: "Failed to cleanup notifications" },
      { status: 500 }
    )
  }
}

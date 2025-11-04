import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { markAsRead } from "@/lib/notification-service"

const ACCESS_COOKIE = "sb-access-token"
const REFRESH_COOKIE = "sb-refresh-token"

async function getAuthedClient(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value
  const supabase = createSupabaseServer()
  if (!supabase || !access || !refresh) return { supabase: null }
  await supabase.auth.setSession({ access_token: access, refresh_token: refresh })
  return { supabase }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase } = await getAuthedClient(request)
    if (!supabase) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const userId = userRes.user.id

    const notificationId = params.id

    // Mark notification as read using unified service
    const success = await markAsRead(notificationId, userId)

    if (!success) {
      return NextResponse.json({ success: false, error: "Failed to mark notification as read" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read"
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json({ success: false, error: "Failed to mark notification as read" }, { status: 500 })
  }
}

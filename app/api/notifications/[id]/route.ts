import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import { deleteNotification } from "@/lib/notification-service"

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

export async function DELETE(
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

    // Delete notification using unified service
    const success = await deleteNotification(notificationId, userId)

    if (!success) {
      return NextResponse.json({ success: false, error: "Failed to delete notification" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Notification deleted"
    })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json({ success: false, error: "Failed to delete notification" }, { status: 500 })
  }
}

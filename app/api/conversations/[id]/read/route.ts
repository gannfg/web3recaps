import { NextRequest, NextResponse } from "next/server"
import { getAuthedClient } from "../../_utils"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const conversationId = params.id
    const body = request.headers.get("content-length") ? await request.json() : {}
    const providedTimestamp = body?.lastReadAt ? new Date(body.lastReadAt) : null
    const lastReadAt = providedTimestamp?.toString() === "Invalid Date" ? null : providedTimestamp
    const nowIso = new Date().toISOString()

    const { data: participant } = await supabase
      .from("conversation_participants")
      .select("last_read_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .single()

    if (!participant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const newLastRead =
      lastReadAt && participant.last_read_at && new Date(participant.last_read_at) > lastReadAt
        ? participant.last_read_at
        : (lastReadAt ?? nowIso)

    const { error } = await supabase
      .from("conversation_participants")
      .update({
        last_read_at: newLastRead,
        updated_at: nowIso
      })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Failed to update last_read_at:", error)
      return NextResponse.json({ error: "Failed to update read status" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Conversation read POST error:", error)
    return NextResponse.json({ error: "Failed to update read status" }, { status: 500 })
  }
}


import { NextRequest, NextResponse } from "next/server"
import { fetchConversation, getAuthedClient } from "../_utils"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const conversationId = params.id
    const { conversation, error } = await fetchConversation(supabase, conversationId, user.id)

    if (error) {
      console.error("Failed to fetch conversation:", error)
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: conversation })
  } catch (error) {
    console.error("Conversation GET error:", error)
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 })
  }
}


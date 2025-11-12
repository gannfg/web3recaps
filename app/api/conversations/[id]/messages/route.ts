import { NextRequest, NextResponse } from "next/server"
import { getAuthedClient } from "../../_utils"

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 40

const MESSAGE_SELECT = `
  id,
  conversation_id,
  sender_id,
  content,
  attachments,
  created_at,
  edited_at,
  deleted_at,
  sender:users!messages_sender_id_fkey(
    id,
    display_name,
    avatar_url,
    email
  )
`

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
    const url = new URL(request.url)
    const limitParam = url.searchParams.get("limit")
    const before = url.searchParams.get("before")
    const after = url.searchParams.get("after")

    let limit = DEFAULT_PAGE_SIZE
    if (limitParam) {
      const parsed = parseInt(limitParam, 10)
      if (!Number.isNaN(parsed)) {
        limit = Math.min(Math.max(parsed, 1), MAX_PAGE_SIZE)
      }
    }

    const participation = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!participation.data) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    let query = supabase
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt("created_at", before)
    }

    if (after) {
      query = query.gt("created_at", after)
    }

    const { data, error } = await query

    if (error) {
      console.error("Failed to load messages:", error)
      return NextResponse.json({ error: "Failed to load messages" }, { status: 500 })
    }

    const messages =
      data?.map((message: any) => ({
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        content: message.content,
        attachments: message.attachments ?? [],
        createdAt: message.created_at,
        editedAt: message.edited_at,
        deletedAt: message.deleted_at,
        sender: message.sender
          ? {
              id: message.sender.id,
              displayName: message.sender.display_name,
              avatarUrl: message.sender.avatar_url,
              email: message.sender.email
            }
          : null
      })) ?? []

    return NextResponse.json({ success: true, data: messages })
  } catch (error) {
    console.error("Messages GET error:", error)
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 })
  }
}

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
    const body = await request.json()
    const rawContent = (body?.content ?? "") as string
    const content = rawContent.trim()

    if (!content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 })
    }

    const attachments = Array.isArray(body?.attachments) ? body.attachments : []

    const { data: participant } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .single()

    if (!participant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { data: insertedMessage, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        attachments
      })
      .select(MESSAGE_SELECT)
      .single()

    if (insertError || !insertedMessage) {
      console.error("Failed to send message:", insertError)
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
    }

    // Update conversation updated_at (fire and forget)
    supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to update conversation timestamp:", error)
        }
      })

    supabase
      .from("conversation_participants")
      .update({
        last_read_at: insertedMessage.created_at,
        updated_at: new Date().toISOString()
      })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .then(({ error }) => {
        if (error) {
          console.error("Failed to update last_read_at:", error)
        }
      })

    const message = {
      id: insertedMessage.id,
      conversationId: insertedMessage.conversation_id,
      senderId: insertedMessage.sender_id,
      content: insertedMessage.content,
      attachments: insertedMessage.attachments ?? [],
      createdAt: insertedMessage.created_at,
      editedAt: insertedMessage.edited_at,
      deletedAt: insertedMessage.deleted_at,
      sender: insertedMessage.sender
        ? {
            id: insertedMessage.sender.id,
            displayName: insertedMessage.sender.display_name,
            avatarUrl: insertedMessage.sender.avatar_url,
            email: insertedMessage.sender.email
          }
        : null
    }

    return NextResponse.json({ success: true, data: message })
  } catch (error) {
    console.error("Messages POST error:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}


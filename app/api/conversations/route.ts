import { NextRequest, NextResponse } from "next/server"
import {
  CONVERSATION_SELECT,
  ensureParticipants,
  fetchConversation,
  getAuthedClient,
  mapConversation
} from "./_utils"

const DM_PARTICIPANT_LIMIT = 2

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const typeFilter = url.searchParams.get("type")

    let query = supabase
      .from("conversation_participants")
      .select(
        `
        conversation:conversations(${CONVERSATION_SELECT})
      `
      )
      .eq("user_id", user.id)
      .order("conversation.updated_at", { ascending: false })

    if (typeFilter) {
      query = query.eq("conversation.type", typeFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error("Failed to load conversations:", error)
      return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 })
    }

    const conversations =
      data
        ?.map((row: any) => (row?.conversation ? mapConversation(row.conversation, user.id) : null))
        .filter(Boolean) ?? []

    return NextResponse.json({ success: true, data: conversations })
  } catch (error) {
    console.error("Conversations GET error:", error)
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedClient(request)
    if (!supabase || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const type = body?.type as "dm" | "team" | "project" | undefined

    if (!type || !["dm", "team", "project"].includes(type)) {
      return NextResponse.json({ error: "Invalid conversation type" }, { status: 400 })
    }

    if (type === "dm") {
      return createDirectMessageConversation(supabase, user.id, body)
    }

    if (type === "team") {
      return createTeamConversation(supabase, user.id, body)
    }

    return createProjectConversation(supabase, user.id, body)
  } catch (error) {
    console.error("Conversations POST error:", error)
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
  }
}

async function createDirectMessageConversation(
  supabase: any,
  userId: string,
  body: any
) {
  const recipientId = body?.recipientId as string | undefined

  if (!recipientId) {
    return NextResponse.json({ error: "Missing recipientId" }, { status: 400 })
  }

  if (recipientId === userId) {
    return NextResponse.json({ error: "Cannot create a conversation with yourself" }, { status: 400 })
  }

  // Ensure recipient exists
  const { data: recipient, error: recipientError } = await supabase
    .from("users")
    .select("id")
    .eq("id", recipientId)
    .single()

  if (recipientError || !recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
  }

  // Check if conversation already exists
  const { data: existingConversations, error: existingError } = await supabase
    .from("conversation_participants")
    .select(
      `
      conversation:conversations(
        ${CONVERSATION_SELECT}
      )
    `
    )
    .eq("user_id", userId)
    .eq("conversation.type", "dm")

  if (existingError) {
    console.error("Failed to check existing DM conversations:", existingError)
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
  }

  const existingConversation = existingConversations?.find((row: any) => {
    const conversation = row?.conversation
    if (!conversation) return false
    const participants = conversation.participants ?? []
    if (participants.length !== DM_PARTICIPANT_LIMIT) return false
    const participantIds = participants.map((p: any) => p.user_id)
    return participantIds.includes(userId) && participantIds.includes(recipientId)
  })

  if (existingConversation?.conversation?.id) {
    return NextResponse.json({
      success: true,
      data: mapConversation(existingConversation.conversation, userId)
    })
  }

  const { data: createdConversation, error: createError } = await supabase
    .from("conversations")
    .insert({
      type: "dm",
      created_by: userId
    })
    .select()
    .single()

  if (createError || !createdConversation) {
    console.error("Failed to create DM conversation:", createError)
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
  }

  await ensureParticipants(supabase, createdConversation.id, [userId, recipientId])

  const { conversation, error } = await fetchConversation(supabase, createdConversation.id, userId)

  if (error || !conversation) {
    console.error("Failed to load DM conversation after creation:", error)
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: conversation })
}

async function createTeamConversation(
  supabase: any,
  userId: string,
  body: any
) {
  const teamId = body?.teamId as string | undefined
  if (!teamId) {
    return NextResponse.json({ error: "Missing teamId" }, { status: 400 })
  }

  // Confirm membership
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .single()

  if (!membership) {
    return NextResponse.json({ error: "You are not a member of this team" }, { status: 403 })
  }

  const conversationId = await upsertScopedConversation(
    supabase,
    {
      type: "team",
      scopeColumn: "team_id",
      scopeValue: teamId,
      createdBy: userId
    }
  )

  if (!conversationId) {
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
  }

  // Sync current team members as participants
  const { data: teamMembers, error: membersError } = await supabase
    .from("team_members")
    .select("user_id, role")
    .eq("team_id", teamId)
    .eq("is_active", true)

  if (membersError) {
    console.error("Failed to load team members for conversation:", membersError)
    return NextResponse.json({ error: "Failed to sync participants" }, { status: 500 })
  }

  const teamMemberIds = (teamMembers ?? []).map((member: any) => member.user_id).filter(Boolean)
  const adminIds = (teamMembers ?? [])
    .filter((member: any) => ["leader", "co_leader", "pm"].includes(member.role))
    .map((member: any) => member.user_id)
    .filter(Boolean)

  await ensureParticipants(
    supabase,
    conversationId,
    teamMemberIds.filter((id: string) => !adminIds.includes(id))
  )

  if (adminIds.length) {
    await ensureParticipants(supabase, conversationId, adminIds, "admin")
  }

  const { conversation, error } = await fetchConversation(supabase, conversationId, userId)
  if (error || !conversation) {
    console.error("Failed to load team conversation after creation:", error)
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: conversation })
}

async function createProjectConversation(
  supabase: any,
  userId: string,
  body: any
) {
  const projectId = body?.projectId as string | undefined
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 })
  }

  const { data: contributor } = await supabase
    .from("project_contributors")
    .select("role, is_active")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .single()

  if (!contributor) {
    return NextResponse.json({ error: "You are not a contributor to this project" }, { status: 403 })
  }

  const conversationId = await upsertScopedConversation(
    supabase,
    {
      type: "project",
      scopeColumn: "project_id",
      scopeValue: projectId,
      createdBy: userId
    }
  )

  if (!conversationId) {
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
  }

  const { data: contributors, error: contributorsError } = await supabase
    .from("project_contributors")
    .select("user_id, role, is_active")
    .eq("project_id", projectId)
    .eq("is_active", true)

  if (contributorsError) {
    console.error("Failed to load project contributors:", contributorsError)
    return NextResponse.json({ error: "Failed to sync participants" }, { status: 500 })
  }

  const contributorIds = (contributors ?? []).map((c: any) => c.user_id).filter(Boolean)
  const adminIds = (contributors ?? [])
    .filter((c: any) => ["lead", "owner", "manager"].includes((c.role || "").toLowerCase()))
    .map((c: any) => c.user_id)
    .filter(Boolean)

  await ensureParticipants(
    supabase,
    conversationId,
    contributorIds.filter((id: string) => !adminIds.includes(id))
  )

  if (adminIds.length) {
    await ensureParticipants(supabase, conversationId, adminIds, "admin")
  }

  const { conversation, error } = await fetchConversation(supabase, conversationId, userId)
  if (error || !conversation) {
    console.error("Failed to load project conversation after creation:", error)
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: conversation })
}

async function upsertScopedConversation(
  supabase: any,
  params: {
    type: "team" | "project"
    scopeColumn: "team_id" | "project_id"
    scopeValue: string
    createdBy: string
  }
) {
  const { type, scopeColumn, scopeValue, createdBy } = params

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      type,
      [scopeColumn]: scopeValue,
      created_by: createdBy
    })
    .select("id")
    .single()

  if (created?.id) {
    return created.id as string
  }

  if (error && error.code !== "23505") {
    console.error("Failed to create scoped conversation:", error)
    return null
  }

  const { data: existing, error: lookupError } = await supabase
    .from("conversations")
    .select("id")
    .eq(scopeColumn, scopeValue)
    .eq("type", type)
    .single()

  if (lookupError || !existing) {
    console.error("Failed to fetch existing scoped conversation:", lookupError)
    return null
  }

  return existing.id as string
}


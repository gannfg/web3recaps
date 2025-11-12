import { NextRequest } from "next/server"
import { createSupabaseServer } from "@/lib/supabase/server"
import type { SupabaseClient, User } from "@supabase/supabase-js"

export const ACCESS_COOKIE = "sb-access-token"
export const REFRESH_COOKIE = "sb-refresh-token"

export const CONVERSATION_SELECT = `
  id,
  type,
  team_id,
  project_id,
  created_by,
  created_at,
  updated_at,
  team:teams(
    id,
    name,
    avatar_url
  ),
  project:projects(
    id,
    name,
    logo_image,
    banner_image
  ),
  participants:conversation_participants(
    user_id,
    role,
    joined_at,
    last_read_at,
    user:users(
      id,
      display_name,
      avatar_url,
      email
    )
  ),
  messages(order=created_at.desc,limit=1)(
    id,
    sender_id,
    content,
    attachments,
    created_at
  )
`

type ConversationRecord = {
  id: string
  type: "dm" | "team" | "project"
  team_id: string | null
  project_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  team?: {
    id: string
    name: string
    avatar_url: string | null
  } | null
  project?: {
    id: string
    name: string | null
    logo_image: string | null
    banner_image: string | null
  } | null
  participants?: Array<{
    user_id: string
    role: "member" | "admin"
    joined_at: string
    last_read_at: string | null
    user: {
      id: string
      display_name: string | null
      avatar_url: string | null
      email: string | null
    } | null
  }>
  messages?: Array<{
    id: string
    sender_id: string
    content: string
    attachments: any
    created_at: string
  }>
}

export async function getAuthedClient(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value
  const supabase = createSupabaseServer()

  if (!supabase || !access || !refresh) {
    return { supabase: null as SupabaseClient | null, user: null as User | null }
  }

  await supabase.auth.setSession({ access_token: access, refresh_token: refresh })
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return { supabase: null as SupabaseClient | null, user: null as User | null }
  }

  return { supabase, user: data.user }
}

export function mapConversation(record: ConversationRecord, currentUserId: string) {
  // Normalize potential array-wrapped relations from Supabase
  // Some PostgREST joins may return arrays when using filters/order in nested selects.
  const normalizedTeam: any = Array.isArray((record as any).team) ? (record as any).team[0] : (record as any).team
  const normalizedProject: any = Array.isArray((record as any).project) ? (record as any).project[0] : (record as any).project
  const participants = (record.participants ?? []).map((p: any) => ({
    ...p,
    user: Array.isArray(p.user) ? p.user[0] : p.user
  }))
  const lastMessage = record.messages?.[0] ?? null
  const currentParticipant = participants.find((p) => p.user_id === currentUserId)

  return {
    id: record.id,
    type: record.type,
    teamId: record.team_id,
    projectId: record.project_id,
    createdBy: record.created_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    team: normalizedTeam
      ? {
          id: normalizedTeam.id,
          name: normalizedTeam.name,
          avatarUrl: normalizedTeam.avatar_url
        }
      : null,
    project: normalizedProject
      ? {
          id: normalizedProject.id,
          name: normalizedProject.name,
          logoImage: normalizedProject.logo_image,
          bannerImage: normalizedProject.banner_image
        }
      : null,
    participants: participants.map((participant) => ({
      userId: participant.user_id,
      role: participant.role,
      joinedAt: participant.joined_at,
      lastReadAt: participant.last_read_at,
      user: participant.user
        ? {
            id: participant.user.id,
            displayName: participant.user.display_name,
            avatarUrl: participant.user.avatar_url,
            email: participant.user.email
          }
        : null
    })),
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          senderId: lastMessage.sender_id,
          content: lastMessage.content,
          attachments: lastMessage.attachments ?? [],
          createdAt: lastMessage.created_at
        }
      : null,
    hasUnread: !!(
      lastMessage &&
      currentParticipant &&
      (!currentParticipant.last_read_at ||
        new Date(lastMessage.created_at).getTime() >
          new Date(currentParticipant.last_read_at).getTime())
    )
  }
}

export async function fetchConversation(
  supabase: SupabaseClient,
  conversationId: string,
  currentUserId: string
) {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("id", conversationId)
    .single()

  if (error || !data) {
    return { conversation: null, error }
  }

  // Cast via unknown to bypass PostgREST select string parser typing issues
  return { conversation: mapConversation(data as unknown as ConversationRecord, currentUserId), error: null }
}

export async function ensureParticipants(
  supabase: SupabaseClient,
  conversationId: string,
  userIds: string[],
  role: "member" | "admin" = "member"
) {
  if (!userIds.length) return

  const now = new Date().toISOString()
  const payload = userIds.map((userId) => ({
    conversation_id: conversationId,
    user_id: userId,
    role,
    joined_at: now,
    updated_at: now
  }))

  const { error } = await supabase
    .from("conversation_participants")
    .upsert(payload, { onConflict: "conversation_id,user_id" })

  if (error) {
    console.error("Failed to ensure participants:", error)
  }
}


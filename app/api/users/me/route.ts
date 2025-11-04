import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseServer } from "@/lib/supabase/server"
import { getRankForXp, awardXp } from "@/lib/gamification"
import { XP_VALUES } from "@/lib/types"

const updateSchema = z.object({
  displayName: z.string().min(1).optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  socialLinks: z.record(z.string()).optional(),
  bannerUrl: z.string().optional(), // Allow base64 data URLs
  avatarUrl: z.string().optional(), // Allow base64 data URLs
  walletAddress: z.string().optional(),
  role: z.string().optional(),
  learningGoals: z.string().optional(),
  learningGoalsList: z.array(z.string()).optional(),
  motivation: z.string().optional(),
  blockchainExperience: z.array(z.string()).optional(),
  solanaExperience: z.string().optional(),
  chains: z.array(z.string()).optional(),
  goals: z.string().optional(),
  builderBio: z.string().optional(),
  builderLinks: z.record(z.string()).optional(),
  newsletterSubscribed: z.boolean().optional(),
})

const ACCESS_COOKIE = "sb-access-token"
const REFRESH_COOKIE = "sb-refresh-token"

async function getAuthedClient(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value
  const supabase = createSupabaseServer()
  if (!supabase || !access || !refresh) return { supabase: null }
  // Set session so client acts on behalf of user
  await supabase.auth.setSession({ access_token: access, refresh_token: refresh })
  return { supabase }
}

export async function GET(request: NextRequest) {
  try {
    console.log("=== /api/users/me GET START ===")
    console.log("Request headers:", Object.fromEntries(request.headers.entries()))
    console.log("Origin:", request.headers.get('origin'))
    console.log("Host:", request.headers.get('host'))
    
    const { supabase } = await getAuthedClient(request)
    console.log("Supabase client created:", !!supabase)
    
    if (!supabase) {
      console.log("No Supabase client - returning null user")
      return NextResponse.json({ 
        success: true, 
        data: { user: null },
        message: "No authenticated user" 
      })
    }

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    
    if (userErr || !userRes.user) {
      console.log("No authenticated user - returning null user")
      return NextResponse.json({ 
        success: true, 
        data: { user: null },
        message: "No authenticated user" 
      })
    }
    const userId = userRes.user.id
    const userEmail = userRes.user.email

    let { data: userRow, error } = await supabase
      .from("users")
      .select("id, display_name, bio, avatar_url, banner_url, wallet_address, role, total_xp, level, rank, skills, social_links, learning_goals, learning_goals_list, motivation, blockchain_experience, solana_experience, chains, goals, builder_bio, builder_links, newsletter_subscribed, kyc_completed, kyc_verified, kyc_status, kyc_document_type, kyc_document_url, kyc_full_name, kyc_submitted_at, kyc_verified_at, kyc_verified_by, created_at")
      .eq("id", userId)
      .single()
    
    // If user doesn't exist in users table, create them
    if (error && error.code === 'PGRST116') {
      console.log("User not found in users table, creating new user record for:", userId)
      console.log("User email:", userEmail)
      
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          id: userId,
          email: userEmail,
          display_name: userEmail?.split('@')[0] || 'User',
          role: 'VISITOR',
          total_xp: 0,
          level: 1,
          rank: 'Newcomer',
          skills: [],
          social_links: {},
          onboarding_completed: false,
          email_verified: true,
          auth_provider: 'email',
          is_suspended: false,
          kyc_completed: false,
          kyc_verified: false,
          kyc_status: null,
          kyc_document_type: null,
          kyc_document_url: null,
          kyc_full_name: null,
          kyc_submitted_at: null,
          kyc_verified_at: null,
          kyc_verified_by: null,
          verification_level: 0,
          newsletter_subscribed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select("id, display_name, bio, avatar_url, banner_url, wallet_address, role, total_xp, level, rank, skills, social_links, learning_goals, learning_goals_list, motivation, blockchain_experience, solana_experience, chains, goals, builder_bio, builder_links, newsletter_subscribed, kyc_completed, kyc_verified, kyc_status, kyc_document_type, kyc_document_url, kyc_full_name, kyc_submitted_at, kyc_verified_at, kyc_verified_by, created_at")
        .single()
      
      if (createError) {
        console.error("Failed to create user record:", createError)
        console.error("Create error details:", JSON.stringify(createError, null, 2))
        return NextResponse.json({ success: false, error: `Failed to create user profile: ${createError.message}` }, { status: 500 })
      }
      
      userRow = newUser
      console.log("User record created successfully:", newUser?.id)
    } else if (error) {
      console.error("Error fetching user:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Ensure userRow is not null after creation
    if (!userRow) {
      return NextResponse.json({ success: false, error: "User not found and could not be created" }, { status: 500 })
    }

    const [postsQuery, eventsQuery, projectsQuery, achievementsQuery] = await Promise.all([
      supabase
        .from("posts")
        .select("id, short_id, author_id, title, content, post_type, tags, github_url, figma_url, website_url, likes_count, comments_count, created_at, updated_at")
        .eq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("events")
        .select("id, title, description, event_date, start_time, end_time, event_type, location, max_attendees, current_attendees_count, is_public, skill_level, xp_reward, tags, status, banner_image, logo_image, cover_image, created_at, updated_at")
        .eq("creator_id", userId)
        .order("event_date", { ascending: false })
        .limit(20),
      supabase
        .from("projects")
        .select("id, name, tagline, description, status, project_type, tags, banner_image, logo_image, github_url, demo_url, website_url, created_at, updated_at")
        .eq("created_by", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("user_achievements")
        .select("earned_at, achievement:achievements(id, name, description, icon, rarity, xp_reward)")
        .eq("user_id", userId)
        .order("earned_at", { ascending: false })
        .limit(20),
    ])

    const posts = (postsQuery.data || []).map((p: any) => ({
      id: p.id,
      shortId: p.short_id,
      authorId: p.author_id,
      title: p.title ?? undefined,
      content: p.content,
      postType: p.post_type,
      tags: p.tags ?? [],
      githubUrl: p.github_url ?? undefined,
      figmaUrl: p.figma_url ?? undefined,
      websiteUrl: p.website_url ?? undefined,
      likesCount: p.likes_count ?? 0,
      commentsCount: p.comments_count ?? 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }))

    const events = (eventsQuery.data || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description ?? undefined,
      eventDate: e.event_date,
      startTime: e.start_time,
      endTime: e.end_time,
      eventType: e.event_type,
      location: e.location,
      capacityType: "limited",
      maxAttendees: e.max_attendees,
      currentAttendeesCount: e.current_attendees_count ?? 0,
      isPublic: e.is_public,
      skillLevel: e.skill_level ?? "all",
      xpReward: e.xp_reward ?? 0,
      tags: e.tags ?? [],
      status: e.status,
      bannerImage: e.banner_image ?? undefined,
      logoImage: e.logo_image ?? undefined,
      coverImage: e.cover_image ?? undefined,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    }))

    const projects = (projectsQuery.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline ?? undefined,
      description: p.description ?? undefined,
      status: p.status,
      projectType: p.project_type,
      tags: p.tags ?? [],
      bannerImage: p.banner_image ?? undefined,
      logoImage: p.logo_image ?? undefined,
      githubUrl: p.github_url ?? undefined,
      demoUrl: p.demo_url ?? undefined,
      websiteUrl: p.website_url ?? undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }))

    const achievements = (achievementsQuery.data || []).map((ua: any) => ({
      id: ua.achievement.id,
      name: ua.achievement.name,
      description: ua.achievement.description,
      icon: ua.achievement.icon,
      rarity: ua.achievement.rarity,
      xpReward: ua.achievement.xp_reward,
      unlockedAt: ua.earned_at,
    }))

    // Normalize role to Title Case for UI and compute rank from XP
    const normalizeRole = (role?: string) => {
      const upper = (role || '').toUpperCase()
      switch (upper) {
        case 'VISITOR': return 'Visitor'
        case 'STUDENT': return 'Student'
        case 'BUILDER': return 'Builder'
        case 'AUTHOR': return 'Author'
        case 'ADMIN': return 'Admin'
        default: return 'Visitor'
      }
    }

    const computedRank = getRankForXp(userRow.total_xp || 0)

    const camelUser = {
      id: userRow.id,
      email: userEmail,
      displayName: userRow.display_name,
      bio: userRow.bio,
      avatarUrl: userRow.avatar_url,
      bannerUrl: userRow.banner_url,
      walletAddress: userRow.wallet_address,
      role: normalizeRole(userRow.role),
      totalXp: userRow.total_xp,
      level: userRow.level,
      rank: computedRank,
      skills: userRow.skills ?? [],
      socialLinks: userRow.social_links ?? {},
      learningGoals: userRow.learning_goals,
      learningGoalsList: userRow.learning_goals_list ?? [],
      motivation: userRow.motivation,
      blockchainExperience: userRow.blockchain_experience ?? [],
      solanaExperience: userRow.solana_experience,
      chains: userRow.chains ?? [],
      goals: userRow.goals,
      builderBio: userRow.builder_bio,
      builderLinks: userRow.builder_links ?? {},
      newsletterSubscribed: userRow.newsletter_subscribed,
      kycCompleted: userRow.kyc_completed,
      kycVerified: userRow.kyc_verified,
      kycStatus: userRow.kyc_status,
      kycDocumentType: userRow.kyc_document_type,
      kycDocumentUrl: userRow.kyc_document_url,
      kycFullName: userRow.kyc_full_name,
      kycSubmittedAt: userRow.kyc_submitted_at,
      kycVerifiedAt: userRow.kyc_verified_at,
      kycVerifiedBy: userRow.kyc_verified_by,
      createdAt: userRow.created_at,
      updatedAt: new Date().toISOString(),
    }

    const response = NextResponse.json({ success: true, data: { user: camelUser, posts, events, projects, achievements } })
    
    // Add CORS headers for production
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load profile"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase } = await getAuthedClient(request)
    if (!supabase) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    
    let updates
    try {
      updates = updateSchema.parse(body)
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log("API PATCH /users/me - Parsed updates:", updates)
      }
    } catch (error) {
      console.error("API PATCH /users/me - Validation error:", error)
      const message = error instanceof Error ? error.message : "Validation failed"
      return NextResponse.json({ success: false, error: `Validation failed: ${message}` }, { status: 400 })
    }

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const userId = userRes.user.id

    // Prevent non-admin role changes via this route
    const safeUpdates = { ...updates } as any
    delete safeUpdates.role

    const { error } = await supabase
      .from("users")
      .update({
        display_name: safeUpdates.displayName,
        bio: safeUpdates.bio,
        avatar_url: safeUpdates.avatarUrl,
        banner_url: safeUpdates.bannerUrl,
        wallet_address: safeUpdates.walletAddress,
        skills: safeUpdates.skills,
        social_links: safeUpdates.socialLinks,
        learning_goals: safeUpdates.learningGoals,
        learning_goals_list: safeUpdates.learningGoalsList,
        motivation: safeUpdates.motivation,
        blockchain_experience: safeUpdates.blockchainExperience,
        solana_experience: safeUpdates.solanaExperience,
        chains: safeUpdates.chains,
        goals: safeUpdates.goals,
        builder_bio: safeUpdates.builderBio,
        builder_links: safeUpdates.builderLinks,
        newsletter_subscribed: safeUpdates.newsletterSubscribed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 })

    // Return refreshed record
    const { data: userRow, error: fetchError } = await supabase
      .from("users")
      .select(
        "id, display_name, bio, avatar_url, banner_url, wallet_address, role, total_xp, level, rank, skills, social_links, learning_goals, learning_goals_list, motivation, blockchain_experience, solana_experience, chains, goals, builder_bio, builder_links, newsletter_subscribed, kyc_completed, kyc_verified, kyc_status, kyc_document_type, kyc_document_url, kyc_full_name, kyc_submitted_at, kyc_verified_at, kyc_verified_by, onboarding_completed, created_at",
      )
      .eq("id", userId)
      .single()

    if (fetchError || !userRow) {
      return NextResponse.json({ success: false, error: "Failed to fetch updated user data" }, { status: 500 })
    }

    // Award XP for profile updates
    const xpAwards = []

    // Check for avatar upload
    if (safeUpdates.avatarUrl && safeUpdates.avatarUrl !== userRow.avatar_url) {
      xpAwards.push({ xp: XP_VALUES.UPLOAD_AVATAR, activity: "Uploaded avatar", details: { avatarUrl: safeUpdates.avatarUrl } })
    }

    // Check for profile completion (basic profile fields)
    const hasDisplayName = safeUpdates.displayName || userRow.display_name
    const hasBio = safeUpdates.bio || userRow.bio
    const hasSkills = (safeUpdates.skills && safeUpdates.skills.length > 0) || (userRow.skills && userRow.skills.length > 0)
    const hasSocialLinks = (safeUpdates.socialLinks && Object.keys(safeUpdates.socialLinks).length > 0) || (userRow.social_links && Object.keys(userRow.social_links).length > 0)

    if (hasDisplayName && hasBio && hasSkills && hasSocialLinks && !userRow.onboarding_completed) {
      // Award XP for completing profile
      xpAwards.push({ xp: XP_VALUES.COMPLETE_PROFILE, activity: "Completed profile", details: { completedAt: new Date().toISOString() } })
      
      // Award XP for completing onboarding
      xpAwards.push({ xp: XP_VALUES.COMPLETE_ONBOARDING, activity: "Completed onboarding", details: { completedAt: new Date().toISOString() } })
      
      // Mark onboarding as completed
      await supabase
        .from("users")
        .update({ onboarding_completed: true })
        .eq("id", userId)
    }

    // Award XP for general profile updates
    if (Object.keys(safeUpdates).length > 0) {
      xpAwards.push({ xp: XP_VALUES.UPDATE_PROFILE, activity: "Updated profile", details: { updatedFields: Object.keys(safeUpdates) } })
    }

    // Award all XP (fire-and-forget)
    xpAwards.forEach(({ xp, activity, details }) => {
      awardXp(userId, xp, activity, details).catch(() => {
        // Silently fail - XP will be handled by background processes
      })
    })

    // Normalize role to Title Case for UI
    const normalizeRole = (role?: string) => {
      const upper = (role || '').toUpperCase()
      switch (upper) {
        case 'VISITOR': return 'Visitor'
        case 'STUDENT': return 'Student'
        case 'BUILDER': return 'Builder'
        case 'AUTHOR': return 'Author'
        case 'ADMIN': return 'Admin'
        default: return 'Visitor'
      }
    }

    // Convert to camelCase for frontend
    const camelUser = {
      id: userRow.id,
      email: userRes.user.email,
      displayName: userRow.display_name,
      bio: userRow.bio,
      avatarUrl: userRow.avatar_url,
      bannerUrl: userRow.banner_url,
      walletAddress: userRow.wallet_address,
      role: normalizeRole(userRow.role),
      totalXp: userRow.total_xp,
      level: userRow.level,
      rank: getRankForXp(userRow.total_xp || 0),
      skills: userRow.skills ?? [],
      socialLinks: userRow.social_links ?? {},
      learningGoals: userRow.learning_goals,
      learningGoalsList: userRow.learning_goals_list ?? [],
      motivation: userRow.motivation,
      blockchainExperience: userRow.blockchain_experience ?? [],
      solanaExperience: userRow.solana_experience,
      chains: userRow.chains ?? [],
      goals: userRow.goals,
      builderBio: userRow.builder_bio,
      builderLinks: userRow.builder_links ?? {},
      newsletterSubscribed: userRow.newsletter_subscribed,
      kycCompleted: userRow.kyc_completed,
      kycVerified: userRow.kyc_verified,
      kycStatus: userRow.kyc_status,
      kycDocumentType: userRow.kyc_document_type,
      kycDocumentUrl: userRow.kyc_document_url,
      kycFullName: userRow.kyc_full_name,
      kycSubmittedAt: userRow.kyc_submitted_at,
      kycVerifiedAt: userRow.kyc_verified_at,
      kycVerifiedBy: userRow.kyc_verified_by,
      createdAt: userRow.created_at,
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, data: { user: camelUser } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update profile"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
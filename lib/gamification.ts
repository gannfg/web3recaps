import { RANK_THRESHOLDS, type XpTransaction, type UserBadge } from "./types"
import { createSupabaseServer } from "./supabase/server"

// Award XP to a user and handle side effects
export async function awardXp(
  userId: string,
  amount: number,
  activity: string,
  details?: any,
): Promise<{ 
  success: boolean; 
  newXp: number; 
  badgesUnlocked: UserBadge[];
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  rankedUp: boolean;
  oldRank: string;
  newRank: string;
}> {
  const supabase = createSupabaseServer()
  if (!supabase) {
    return { 
      success: false, 
      newXp: 0, 
      badgesUnlocked: [],
      leveledUp: false,
      oldLevel: 0,
      newLevel: 0,
      rankedUp: false,
      oldRank: '',
      newRank: ''
    }
  }

  try {
    // Get current user data
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("total_xp, level, rank")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      return { 
        success: false, 
        newXp: 0, 
        badgesUnlocked: [],
        leveledUp: false,
        oldLevel: 0,
        newLevel: 0,
        rankedUp: false,
        oldRank: '',
        newRank: ''
      }
    }

    const oldXp = user.total_xp || 0
    const newXp = oldXp + amount
    const oldLevel = user.level || 1
    const newLevel = Math.floor(newXp / 100) + 1
    const oldRank = user.rank || "Newcomer"
    const newRank = getRankForXp(newXp)
    
    const leveledUp = newLevel > oldLevel
    const rankedUp = newRank !== oldRank

    // Create XP transaction
    const { error: transactionError } = await supabase
      .from("xp_transactions")
      .insert({
        user_id: userId,
        activity,
        xp_earned: amount, // Fixed: use correct field name
        timestamp: new Date().toISOString(), // Fixed: use correct field name
        details: details ? JSON.stringify(details) : null,
      })

    if (transactionError) {
      console.error("Error creating XP transaction:", transactionError)
    }

    // Update user's total XP
    const { error: updateError } = await supabase
      .from("users")
      .update({
        total_xp: newXp,
        rank: newRank,
        level: newLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (updateError) {
      console.error("Error updating user XP:", updateError)
      return { 
        success: false, 
        newXp: 0, 
        badgesUnlocked: [],
        leveledUp: false,
        oldLevel: 0,
        newLevel: 0,
        rankedUp: false,
        oldRank: '',
        newRank: ''
      }
    }

    // Check for badge unlocks
    // Database triggers will automatically update XP and badge statistics
    const badgesUnlocked = await checkBadgeUnlocks(userId, oldXp, newXp)

    return { 
      success: true, 
      newXp, 
      badgesUnlocked,
      leveledUp,
      oldLevel,
      newLevel,
      rankedUp,
      oldRank,
      newRank
    }
  } catch (error) {
    console.error("Error in awardXp:", error)
    return { 
      success: false, 
      newXp: 0, 
      badgesUnlocked: [],
      leveledUp: false,
      oldLevel: 0,
      newLevel: 0,
      rankedUp: false,
      oldRank: '',
      newRank: ''
    }
  }
}

// Get rank for XP amount
export function getRankForXp(xp: number): string {
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= RANK_THRESHOLDS[i].minXp) {
      return RANK_THRESHOLDS[i].name
    }
  }
  return "Newcomer"
}

// Get next rank info
export function getNextRank(currentXp: number): { name: string; minXp: number; progress: number } | null {
  const currentRankIndex = RANK_THRESHOLDS.findIndex((rank) => currentXp < rank.minXp)

  if (currentRankIndex === -1) {
    return null // Already at max rank
  }

  const nextRank = RANK_THRESHOLDS[currentRankIndex]
  const currentRank = RANK_THRESHOLDS[currentRankIndex - 1] || RANK_THRESHOLDS[0]

  const progress =
    currentRankIndex === 0
      ? currentXp / nextRank.minXp
      : (currentXp - currentRank.minXp) / (nextRank.minXp - currentRank.minXp)

  return {
    name: nextRank.name,
    minXp: nextRank.minXp,
    progress: Math.min(progress, 1),
  }
}

// Check for badge unlocks
async function checkBadgeUnlocks(userId: string, oldXp: number, newXp: number): Promise<UserBadge[]> {
  const supabase = createSupabaseServer()
  if (!supabase) return []

  try {
    const unlockedBadges: UserBadge[] = []

    // Check XP milestone badges
    const xpMilestones = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000]
    for (const milestone of xpMilestones) {
      if (oldXp < milestone && newXp >= milestone) {
        let icon = '🥉'
        let rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' = 'common'
        
        if (milestone >= 25000) { icon = '💎'; rarity = 'legendary' }
        else if (milestone >= 10000) { icon = '🏆'; rarity = 'legendary' }
        else if (milestone >= 5000) { icon = '🥇'; rarity = 'epic' }
        else if (milestone >= 2500) { icon = '🥈'; rarity = 'epic' }
        else if (milestone >= 1000) { icon = '🥉'; rarity = 'rare' }
        else if (milestone >= 500) { icon = '🎖️'; rarity = 'uncommon' }
        else if (milestone >= 250) { icon = '🎯'; rarity = 'uncommon' }
        else { icon = '⭐'; rarity = 'common' }

        const badge = await createOrGetBadge({
          badgeId: `xp_milestone_${milestone}`,
          badgeName: `${milestone} XP Milestone`,
          badgeDescription: `Reached ${milestone.toLocaleString()} total XP!`,
          badgeIcon: icon,
          badgeRarity: rarity
        })
        
        if (badge) {
          const userBadge = await awardBadgeToUser(userId, badge)
          if (userBadge) unlockedBadges.push(userBadge)
        }
      }
    }

    // Check streak badges
    const streak = await computeStreak(userId)
    const streakMilestones = [7, 30, 100, 365]
    for (const milestone of streakMilestones) {
      if (streak >= milestone) {
        const badge = await createOrGetBadge({
          badgeId: `streak_${milestone}`,
          badgeName: `${milestone} Day Streak`,
          badgeDescription: `Maintained ${milestone} day check-in streak!`,
          badgeIcon: milestone >= 365 ? '🔥🔥🔥' : milestone >= 100 ? '🔥🔥' : '🔥',
          badgeRarity: milestone >= 365 ? 'legendary' : milestone >= 100 ? 'epic' : 'rare'
        })
        
        if (badge) {
          const userBadge = await awardBadgeToUser(userId, badge)
          if (userBadge) unlockedBadges.push(userBadge)
        }
      }
    }

    // Check activity-based badges
    const activityBadges = await checkActivityBadges(userId)
    unlockedBadges.push(...activityBadges)

    return unlockedBadges
  } catch (error) {
    console.error("Error checking badge unlocks:", error)
    return []
  }
}

// Check for activity-based badges
async function checkActivityBadges(userId: string): Promise<UserBadge[]> {
  const supabase = createSupabaseServer()
  if (!supabase) return []

  try {
    const unlockedBadges: UserBadge[] = []

    // Get user activity counts
    const [
      postsResult,
      projectsResult,
      teamsResult,
      eventsResult,
      commentsResult,
      likesResult
    ] = await Promise.all([
      supabase.from('posts').select('id').eq('author_id', userId),
      supabase.from('projects').select('id').eq('created_by', userId),
      supabase.from('teams').select('id').eq('created_by', userId),
      supabase.from('events').select('id').eq('creator_id', userId),
      supabase.from('comments').select('id').eq('author_id', userId),
      supabase.from('post_likes').select('id').eq('user_id', userId)
    ])

    const postCount = postsResult.data?.length || 0
    const projectCount = projectsResult.data?.length || 0
    const teamCount = teamsResult.data?.length || 0
    const eventCount = eventsResult.data?.length || 0
    const commentCount = commentsResult.data?.length || 0
    const likeCount = likesResult.data?.length || 0

    // Content Creation Badges
    const contentBadges = [
      { count: 1, id: 'first_post', name: 'First Post', desc: 'Created your first post!', icon: '📝', rarity: 'common' as const },
      { count: 10, id: 'prolific_poster', name: 'Prolific Poster', desc: 'Created 10 posts', icon: '📚', rarity: 'uncommon' as const },
      { count: 50, id: 'content_creator', name: 'Content Creator', desc: 'Created 50 posts', icon: '✍️', rarity: 'rare' as const },
      { count: 100, id: 'storyteller', name: 'Storyteller', desc: 'Created 100 posts', icon: '📖', rarity: 'epic' as const },
      { count: 500, id: 'legendary_author', name: 'Legendary Author', desc: 'Created 500 posts', icon: '👑', rarity: 'legendary' as const }
    ]

    for (const badge of contentBadges) {
      if (postCount >= badge.count && !(await hasBadge(userId, badge.id))) {
        const userBadge = await awardBadgeToUser(userId, await createOrGetBadge({
          badgeId: badge.id,
          badgeName: badge.name,
          badgeDescription: badge.desc,
          badgeIcon: badge.icon,
          badgeRarity: badge.rarity
        }))
        if (userBadge) unlockedBadges.push(userBadge)
      }
    }

    // Project Creation Badges
    const projectBadges = [
      { count: 1, id: 'first_project', name: 'First Project', desc: 'Created your first project!', icon: '🚀', rarity: 'common' as const },
      { count: 5, id: 'project_builder', name: 'Project Builder', desc: 'Created 5 projects', icon: '🏗️', rarity: 'uncommon' as const },
      { count: 15, id: 'serial_innovator', name: 'Serial Innovator', desc: 'Created 15 projects', icon: '💡', rarity: 'rare' as const },
      { count: 30, id: 'visionary', name: 'Visionary', desc: 'Created 30 projects', icon: '🌟', rarity: 'epic' as const }
    ]

    for (const badge of projectBadges) {
      if (projectCount >= badge.count && !(await hasBadge(userId, badge.id))) {
        const userBadge = await awardBadgeToUser(userId, await createOrGetBadge({
          badgeId: badge.id,
          badgeName: badge.name,
          badgeDescription: badge.desc,
          badgeIcon: badge.icon,
          badgeRarity: badge.rarity
        }))
        if (userBadge) unlockedBadges.push(userBadge)
      }
    }

    // Team Leadership Badges
    const teamBadges = [
      { count: 1, id: 'first_team', name: 'Team Founder', desc: 'Created your first team!', icon: '👥', rarity: 'common' as const },
      { count: 3, id: 'team_builder', name: 'Team Builder', desc: 'Created 3 teams', icon: '🏢', rarity: 'uncommon' as const },
      { count: 10, id: 'community_leader', name: 'Community Leader', desc: 'Created 10 teams', icon: '🎖️', rarity: 'rare' as const }
    ]

    for (const badge of teamBadges) {
      if (teamCount >= badge.count && !(await hasBadge(userId, badge.id))) {
        const userBadge = await awardBadgeToUser(userId, await createOrGetBadge({
          badgeId: badge.id,
          badgeName: badge.name,
          badgeDescription: badge.desc,
          badgeIcon: badge.icon,
          badgeRarity: badge.rarity
        }))
        if (userBadge) unlockedBadges.push(userBadge)
      }
    }

    // Event Host Badges
    const eventBadges = [
      { count: 1, id: 'first_event', name: 'Event Host', desc: 'Hosted your first event!', icon: '🎪', rarity: 'common' as const },
      { count: 5, id: 'event_organizer', name: 'Event Organizer', desc: 'Hosted 5 events', icon: '📅', rarity: 'uncommon' as const },
      { count: 15, id: 'community_connector', name: 'Community Connector', desc: 'Hosted 15 events', icon: '🤝', rarity: 'rare' as const }
    ]

    for (const badge of eventBadges) {
      if (eventCount >= badge.count && !(await hasBadge(userId, badge.id))) {
        const userBadge = await awardBadgeToUser(userId, await createOrGetBadge({
          badgeId: badge.id,
          badgeName: badge.name,
          badgeDescription: badge.desc,
          badgeIcon: badge.icon,
          badgeRarity: badge.rarity
        }))
        if (userBadge) unlockedBadges.push(userBadge)
      }
    }

    // Engagement Badges
    const engagementBadges = [
      { count: 10, id: 'social_butterfly', name: 'Social Butterfly', desc: 'Liked 10 posts', icon: '🦋', rarity: 'common' as const },
      { count: 100, id: 'appreciator', name: 'Appreciator', desc: 'Liked 100 posts', icon: '❤️', rarity: 'uncommon' as const },
      { count: 500, id: 'community_supporter', name: 'Community Supporter', desc: 'Liked 500 posts', icon: '🤗', rarity: 'rare' as const },
      { count: 50, id: 'conversationalist', name: 'Conversationalist', desc: 'Made 50 comments', icon: '💬', rarity: 'uncommon' as const },
      { count: 200, id: 'active_commenter', name: 'Active Commenter', desc: 'Made 200 comments', icon: '🗣️', rarity: 'rare' as const }
    ]

    for (const badge of engagementBadges) {
      const count = badge.id.includes('comment') ? commentCount : likeCount
      if (count >= badge.count && !(await hasBadge(userId, badge.id))) {
        const userBadge = await awardBadgeToUser(userId, await createOrGetBadge({
          badgeId: badge.id,
          badgeName: badge.name,
          badgeDescription: badge.desc,
          badgeIcon: badge.icon,
          badgeRarity: badge.rarity
        }))
        if (userBadge) unlockedBadges.push(userBadge)
      }
    }

    return unlockedBadges
  } catch (error) {
    console.error("Error checking activity badges:", error)
    return []
  }
}

// Check if user already has a badge
async function hasBadge(userId: string, badgeId: string): Promise<boolean> {
  const supabase = createSupabaseServer()
  if (!supabase) return false

  try {
    const { data } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .limit(1)
      .single()

    return !!data
  } catch (error) {
    return false
  }
}

// Create or get badge by ID
async function createOrGetBadge(badgeData: {
  badgeId: string
  badgeName: string
  badgeDescription: string
  badgeIcon: string
  badgeRarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}): Promise<any> {
  const supabase = createSupabaseServer()
  if (!supabase) return null

  try {
    // Check if badge already exists
    const { data: existingBadge } = await supabase
      .from('user_badges')
      .select('*')
      .eq('badge_id', badgeData.badgeId)
      .limit(1)
      .single()

    if (existingBadge) {
      return existingBadge
    }

    // Create new badge
    const { data: newBadge, error } = await supabase
      .from('user_badges')
      .insert({
        badge_id: badgeData.badgeId,
        badge_name: badgeData.badgeName,
        badge_description: badgeData.badgeDescription,
        badge_icon: badgeData.badgeIcon,
        badge_rarity: badgeData.badgeRarity
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating badge:", error)
      return null
    }

    return newBadge
  } catch (error) {
    console.error("Error in createOrGetBadge:", error)
    return null
  }
}

// Award badge to user
async function awardBadgeToUser(userId: string, badge: any): Promise<UserBadge | null> {
  const supabase = createSupabaseServer()
  if (!supabase) return null

  try {
    // Check if user already has this badge
    const { data: existingUserBadge } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .eq('badge_id', badge.badge_id)
      .limit(1)
      .single()

    if (existingUserBadge) {
      return existingUserBadge
    }

    // Award badge to user
    const { data: userBadge, error } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badge.badge_id,
        badge_name: badge.badge_name,
        badge_description: badge.badge_description,
        badge_icon: badge.badge_icon,
        badge_rarity: badge.badge_rarity,
        unlocked_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error("Error awarding badge to user:", error)
      return null
    }

    return userBadge
  } catch (error) {
    console.error("Error in awardBadgeToUser:", error)
    return null
  }
}

// Compute check-in streak for a user
export async function computeStreak(userId: string): Promise<number> {
  const supabase = createSupabaseServer()
  if (!supabase) {
    return 0
  }

  try {
    // Get user's checkins ordered by date
    const { data: checkins, error } = await supabase
      .from("checkins")
      .select("date")
      .eq("user_id", userId)
      .order("date", { ascending: false })

    if (error || !checkins || checkins.length === 0) {
      return 0
    }

    let streak = 0
    let currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    for (const checkin of checkins) {
      const checkinDate = new Date(checkin.date)
      checkinDate.setHours(0, 0, 0, 0)

      const daysDiff = Math.floor((currentDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff === streak) {
        streak++
        currentDate = checkinDate
      } else if (daysDiff === streak + 1) {
        // Allow for today not being checked in yet
        if (streak === 0) {
          streak++
          currentDate = checkinDate
        } else {
          break
        }
      } else {
        break
      }
    }

    return streak
  } catch (error) {
    console.error("Error computing streak:", error)
    return 0
  }
}

// Generate daily check-in QR code
export function generateDailyQrCode(): string {
  const today = new Date().toISOString().split("T")[0]
  return `obelisk-daily-${today}`
}

// Validate daily check-in QR code
export function validateDailyQrCode(code: string): boolean {
  const today = new Date().toISOString().split("T")[0]
  return code === `obelisk-daily-${today}`
}

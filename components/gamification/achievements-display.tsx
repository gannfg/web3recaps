"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { BadgePill } from "@/components/gamification/badge-pill"
import { useApi } from "@/hooks/use-api"
import { Trophy, Target, Zap, Crown, Star, Lock, CheckCircle, TrendingUp, Users, Calendar, MessageSquare, Heart, BookOpen, Code, Award } from "lucide-react"
import type { UserBadge } from "@/lib/types"

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  xpReward?: number
  unlockedAt?: string
}

interface ProgressData {
  current: number
  target: number
  progress: number
}

interface AchievementsDisplayProps {
  userBadges: Achievement[]
  userId: string
  userXp: number
  userPosts?: any[]
  userEvents?: any[]
  userTeams?: any[]
  userProjects?: any[]
}

// Define achievement categories and their progress tracking
const ACHIEVEMENT_CATEGORIES = {
  content: {
    name: "Content Creation",
    icon: <BookOpen className="h-5 w-5" />,
    color: "text-blue-600",
    achievements: [
      { id: 'first_post', name: 'First Post', target: 1, icon: '📝', rarity: 'common' as const },
      { id: 'prolific_poster', name: 'Prolific Poster', target: 10, icon: '📚', rarity: 'uncommon' as const },
      { id: 'content_creator', name: 'Content Creator', target: 50, icon: '✍️', rarity: 'rare' as const },
      { id: 'storyteller', name: 'Storyteller', target: 100, icon: '📖', rarity: 'epic' as const },
      { id: 'legendary_author', name: 'Legendary Author', target: 500, icon: '👑', rarity: 'legendary' as const }
    ]
  },
  projects: {
    name: "Projects",
    icon: <Code className="h-5 w-5" />,
    color: "text-green-600",
    achievements: [
      { id: 'first_project', name: 'First Project', target: 1, icon: '🚀', rarity: 'common' as const },
      { id: 'project_builder', name: 'Project Builder', target: 5, icon: '🏗️', rarity: 'uncommon' as const },
      { id: 'serial_innovator', name: 'Serial Innovator', target: 15, icon: '💡', rarity: 'rare' as const },
      { id: 'visionary', name: 'Visionary', target: 30, icon: '🌟', rarity: 'epic' as const }
    ]
  },
  teams: {
    name: "Team Leadership",
    icon: <Users className="h-5 w-5" />,
    color: "text-purple-600",
    achievements: [
      { id: 'first_team', name: 'Team Founder', target: 1, icon: '👥', rarity: 'common' as const },
      { id: 'team_builder', name: 'Team Builder', target: 3, icon: '🏢', rarity: 'uncommon' as const },
      { id: 'community_leader', name: 'Community Leader', target: 10, icon: '🎖️', rarity: 'rare' as const }
    ]
  },
  events: {
    name: "Event Hosting",
    icon: <Calendar className="h-5 w-5" />,
    color: "text-orange-600",
    achievements: [
      { id: 'first_event', name: 'Event Host', target: 1, icon: '🎪', rarity: 'common' as const },
      { id: 'event_organizer', name: 'Event Organizer', target: 5, icon: '📅', rarity: 'uncommon' as const },
      { id: 'community_connector', name: 'Community Connector', target: 15, icon: '🤝', rarity: 'rare' as const }
    ]
  },
  engagement: {
    name: "Community Engagement",
    icon: <Heart className="h-5 w-5" />,
    color: "text-red-600",
    achievements: [
      { id: 'social_butterfly', name: 'Social Butterfly', target: 10, icon: '🦋', rarity: 'common' as const },
      { id: 'appreciator', name: 'Appreciator', target: 100, icon: '❤️', rarity: 'uncommon' as const },
      { id: 'community_supporter', name: 'Community Supporter', target: 500, icon: '🤗', rarity: 'rare' as const },
      { id: 'conversationalist', name: 'Conversationalist', target: 50, icon: '💬', rarity: 'uncommon' as const },
      { id: 'active_commenter', name: 'Active Commenter', target: 200, icon: '🗣️', rarity: 'rare' as const }
    ]
  },
  xp: {
    name: "XP Milestones",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "text-yellow-600",
    achievements: [
      { id: 'xp_milestone_100', name: '100 XP Milestone', target: 100, icon: '⭐', rarity: 'common' as const },
      { id: 'xp_milestone_250', name: '250 XP Milestone', target: 250, icon: '🎯', rarity: 'uncommon' as const },
      { id: 'xp_milestone_500', name: '500 XP Milestone', target: 500, icon: '🎖️', rarity: 'uncommon' as const },
      { id: 'xp_milestone_1000', name: '1000 XP Milestone', target: 1000, icon: '🥉', rarity: 'rare' as const },
      { id: 'xp_milestone_2500', name: '2500 XP Milestone', target: 2500, icon: '🥈', rarity: 'epic' as const },
      { id: 'xp_milestone_5000', name: '5000 XP Milestone', target: 5000, icon: '🥇', rarity: 'epic' as const },
      { id: 'xp_milestone_10000', name: '10000 XP Milestone', target: 10000, icon: '🏆', rarity: 'legendary' as const },
      { id: 'xp_milestone_25000', name: '25000 XP Milestone', target: 25000, icon: '💎', rarity: 'legendary' as const },
      { id: 'xp_milestone_50000', name: '50000 XP Milestone', target: 50000, icon: '👑', rarity: 'legendary' as const }
    ]
  }
}

const RARITY_COLORS = {
  common: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200",
  uncommon: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200",
  rare: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200",
  epic: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 border-purple-200",
  legendary: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 border-orange-200",
}

const RARITY_ICONS = {
  common: <Star className="h-4 w-4" />,
  uncommon: <Target className="h-4 w-4" />,
  rare: <Zap className="h-4 w-4" />,
  epic: <Crown className="h-4 w-4" />,
  legendary: <Trophy className="h-4 w-4" />
}

export function AchievementsDisplay({ userBadges, userId, userXp, userPosts = [], userEvents = [], userTeams = [], userProjects = [] }: AchievementsDisplayProps) {
  const { execute } = useApi()
  const [userStats, setUserStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserStats()
  }, [userId, userPosts, userEvents, userTeams, userProjects, userXp])

  const fetchUserStats = async () => {
    try {
      // Try to get optimized stats from the new stats API
      const statsResult = await execute('/api/users/stats')
      
      if (statsResult.success && statsResult.data?.stats) {
        const stats = statsResult.data.stats
        setUserStats({
          posts: stats.totalPosts,
          projects: stats.totalProjects,
          teams: stats.totalTeamsCreated + stats.totalTeamsJoined,
          events: stats.totalEventsCreated,
          comments: stats.totalCommentsReceived,
          likes: stats.totalLikesReceived,
          xp: stats.totalXp
        })
      } else {
        // Fallback to props data if stats API fails
        setUserStats({
          posts: userPosts.length,
          projects: userProjects.length,
          teams: userTeams.length,
          events: userEvents.length,
          comments: 0, // TODO: Add comments when available
          likes: 0, // TODO: Add likes when available
          xp: userXp
        })
      }
    } catch (error) {
      console.error("Failed to fetch user stats:", error)
      // Fallback to props data
      setUserStats({
        posts: userPosts.length,
        projects: userProjects.length,
        teams: userTeams.length,
        events: userEvents.length,
        comments: 0,
        likes: 0,
        xp: userXp
      })
    } finally {
      setLoading(false)
    }
  }

  const getProgressForAchievement = (achievementId: string, target: number): ProgressData => {
    let current = 0

    if (achievementId.includes('post')) current = userStats.posts
    else if (achievementId.includes('project')) current = userStats.projects
    else if (achievementId.includes('team')) current = userStats.teams
    else if (achievementId.includes('event')) current = userStats.events
    else if (achievementId.includes('comment')) current = userStats.comments
    else if (achievementId.includes('like') || achievementId.includes('appreciator') || achievementId.includes('social')) current = userStats.likes
    else if (achievementId.includes('xp_milestone')) current = userStats.xp

    const progress = Math.min((current / target) * 100, 100)
    return { current, target, progress }
  }

  const getAchievementStatus = (achievementId: string): 'locked' | 'unlocked' | 'in_progress' => {
    const userBadge = userBadges.find(b => b.id === achievementId)
    if (userBadge) return 'unlocked'
    
    // Check if user has met the requirements
    const category = Object.values(ACHIEVEMENT_CATEGORIES).find(cat => 
      cat.achievements.some(a => a.id === achievementId)
    )
    if (category) {
      const achievement = category.achievements.find(a => a.id === achievementId)
      if (achievement) {
        const progress = getProgressForAchievement(achievementId, achievement.target)
        // If user has met or exceeded the target, consider it unlocked
        if (progress.current >= achievement.target) {
          return 'unlocked'
        }
        // If user has made some progress, show as in progress
        return progress.current > 0 ? 'in_progress' : 'locked'
      }
    }
    
    return 'locked'
  }

  const renderAchievementCard = (achievement: any, category: string) => {
    const status = getAchievementStatus(achievement.id)
    const progress = getProgressForAchievement(achievement.id, achievement.target)
    const userBadge = userBadges.find(b => b.id === achievement.id)

    return (
      <Card 
        key={achievement.id} 
        className={`transition-all duration-200 hover:shadow-md ${
          status === 'unlocked' ? 'ring-2 ring-green-200 bg-green-50/50 dark:bg-green-950/20' : 
          status === 'in_progress' ? 'ring-1 ring-blue-200 bg-blue-50/30 dark:bg-blue-950/10' : 
          'opacity-60'
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`text-2xl ${status === 'locked' ? 'grayscale opacity-50' : ''}`}>
              {achievement.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm">{achievement.name}</h4>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${RARITY_COLORS[achievement.rarity as keyof typeof RARITY_COLORS]}`}
                >
                  {RARITY_ICONS[achievement.rarity as keyof typeof RARITY_ICONS]}
                  <span className="ml-1 capitalize">{achievement.rarity}</span>
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {status === 'unlocked' ? 'Achievement unlocked!' : 
                 `Complete ${category.toLowerCase()} activities to unlock`}
              </p>

              {status !== 'unlocked' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{progress.current}/{progress.target}</span>
                  </div>
                  <Progress value={progress.progress} className="h-2" />
                </div>
              )}

              {status === 'unlocked' && userBadge && (
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">
                    Unlocked {userBadge.unlockedAt ? new Date(userBadge.unlockedAt).toLocaleDateString() : 'recently'}
                  </span>
                </div>
              )}
            </div>

            {status === 'locked' && (
              <Lock className="h-4 w-4 text-muted-foreground/50" />
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievement Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(ACHIEVEMENT_CATEGORIES).reduce((total, cat) => 
                  total + cat.achievements.filter(a => getAchievementStatus(a.id) === 'unlocked').length, 0
                )}
              </div>
              <div className="text-xs text-muted-foreground">Unlocked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{Object.values(ACHIEVEMENT_CATEGORIES).reduce((total, cat) => total + cat.achievements.length, 0)}</div>
              <div className="text-xs text-muted-foreground">Total Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((
                  Object.values(ACHIEVEMENT_CATEGORIES).reduce((total, cat) => 
                    total + cat.achievements.filter(a => getAchievementStatus(a.id) === 'unlocked').length, 0
                  ) / Object.values(ACHIEVEMENT_CATEGORIES).reduce((total, cat) => total + cat.achievements.length, 0)
                ) * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">Completion</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{userXp.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total XP</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Categories */}
      {Object.entries(ACHIEVEMENT_CATEGORIES).map(([categoryKey, category]) => (
        <div key={categoryKey}>
          <div className="flex items-center gap-2 mb-4">
            <div className={category.color}>{category.icon}</div>
            <h3 className="text-lg font-semibold">{category.name}</h3>
            <Badge variant="outline" className="text-xs">
              {category.achievements.filter(a => getAchievementStatus(a.id) === 'unlocked').length}/{category.achievements.length}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.achievements.map(achievement => 
              renderAchievementCard(achievement, category.name)
            )}
          </div>
        </div>
      ))}

      {/* Recent Badges */}
      {userBadges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {userBadges
                .sort((a, b) => new Date(b.unlockedAt || 0).getTime() - new Date(a.unlockedAt || 0).getTime())
                .slice(0, 8)
                .map(badge => (
                  <BadgePill
                    key={badge.id}
                    badge={{
                      id: badge.id,
                      userId: userId,
                      badgeId: badge.id,
                      badgeName: badge.name,
                      rarity: badge.rarity,
                      unlockedAt: badge.unlockedAt || new Date().toISOString()
                    }}
                    showTooltip={true}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

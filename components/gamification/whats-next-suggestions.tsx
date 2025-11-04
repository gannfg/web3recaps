"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Target, Trophy, Star, Zap, Users, MessageSquare, Heart, Bookmark } from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { XP_VALUES } from '@/lib/types'

interface AchievementSuggestion {
  id: string
  title: string
  description: string
  icon: string
  xpReward: number
  progress: number
  maxProgress: number
  category: 'content' | 'social' | 'engagement' | 'milestone'
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTime: string
  actionUrl?: string
}

interface UserStats {
  totalXp: number
  level: number
  rank: string
  postsCount: number
  commentsCount: number
  likesGiven: number
  teamsJoined: number
  projectsCreated: number
  eventsAttended: number
  checkinStreak: number
  badgesEarned: number
}

export function WhatsNextSuggestions() {
  const { execute } = useApi()
  const [suggestions, setSuggestions] = useState<AchievementSuggestion[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserStats()
  }, [])

  const fetchUserStats = async () => {
    try {
      setLoading(true)
      const result = await execute('/api/users/me')
      if (result.success) {
        setUserStats(result.data)
        generateSuggestions(result.data)
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateSuggestions = (stats: UserStats) => {
    const newSuggestions: AchievementSuggestion[] = []

    // Content Creation Suggestions
    if (stats.postsCount < 5) {
      newSuggestions.push({
        id: 'first-posts',
        title: 'Content Creator',
        description: `Create ${5 - stats.postsCount} more posts to unlock the "First Posts" achievement`,
        icon: '📝',
        xpReward: XP_VALUES.FIRST_POST,
        progress: stats.postsCount,
        maxProgress: 5,
        category: 'content',
        difficulty: 'easy',
        estimatedTime: '5-10 min',
        actionUrl: '/feed'
      })
    }

    if (stats.postsCount >= 5 && stats.postsCount < 20) {
      newSuggestions.push({
        id: 'regular-poster',
        title: 'Regular Poster',
        description: `Create ${20 - stats.postsCount} more posts to become a regular contributor`,
        icon: '📚',
        xpReward: XP_VALUES.CREATE_POST * 15,
        progress: stats.postsCount,
        maxProgress: 20,
        category: 'content',
        difficulty: 'medium',
        estimatedTime: '30-60 min',
        actionUrl: '/feed'
      })
    }

    // Social Engagement Suggestions
    if (stats.commentsCount < 10) {
      newSuggestions.push({
        id: 'active-commenter',
        title: 'Active Commenter',
        description: `Leave ${10 - stats.commentsCount} more comments to engage with the community`,
        icon: '💬',
        xpReward: XP_VALUES.COMMENT_POST * 10,
        progress: stats.commentsCount,
        maxProgress: 10,
        category: 'social',
        difficulty: 'easy',
        estimatedTime: '10-15 min',
        actionUrl: '/feed'
      })
    }

    if (stats.likesGiven < 25) {
      newSuggestions.push({
        id: 'community-supporter',
        title: 'Community Supporter',
        description: `Give ${25 - stats.likesGiven} more likes to support other creators`,
        icon: '❤️',
        xpReward: XP_VALUES.LIKE_POST * 25,
        progress: stats.likesGiven,
        maxProgress: 25,
        category: 'social',
        difficulty: 'easy',
        estimatedTime: '5-10 min',
        actionUrl: '/feed'
      })
    }

    // Team Collaboration Suggestions
    if (stats.teamsJoined === 0) {
      newSuggestions.push({
        id: 'team-player',
        title: 'Team Player',
        description: 'Join your first team to start collaborating with others',
        icon: '👥',
        xpReward: XP_VALUES.JOIN_TEAM,
        progress: 0,
        maxProgress: 1,
        category: 'engagement',
        difficulty: 'easy',
        estimatedTime: '2-5 min',
        actionUrl: '/teams'
      })
    }

    if (stats.teamsJoined > 0 && stats.projectsCreated === 0) {
      newSuggestions.push({
        id: 'project-creator',
        title: 'Project Creator',
        description: 'Create your first project to showcase your work',
        icon: '🚀',
        xpReward: XP_VALUES.CREATE_PROJECT,
        progress: 0,
        maxProgress: 1,
        category: 'content',
        difficulty: 'medium',
        estimatedTime: '15-30 min',
        actionUrl: '/projects'
      })
    }

    // Event Participation Suggestions
    if (stats.eventsAttended === 0) {
      newSuggestions.push({
        id: 'event-attendee',
        title: 'Event Attendee',
        description: 'Attend your first event to connect with the community',
        icon: '🎉',
        xpReward: XP_VALUES.ATTEND_EVENT,
        progress: 0,
        maxProgress: 1,
        category: 'engagement',
        difficulty: 'easy',
        estimatedTime: '30-60 min',
        actionUrl: '/events'
      })
    }

    // Streak Milestones
    if (stats.checkinStreak < 7) {
      newSuggestions.push({
        id: 'week-streak',
        title: 'Week Warrior',
        description: `Check in ${7 - stats.checkinStreak} more days to reach a 7-day streak`,
        icon: '🔥',
        xpReward: XP_VALUES.STREAK_MILESTONE_7,
        progress: stats.checkinStreak,
        maxProgress: 7,
        category: 'milestone',
        difficulty: 'medium',
        estimatedTime: '1 week',
        actionUrl: '/checkin'
      })
    }

    if (stats.checkinStreak >= 7 && stats.checkinStreak < 30) {
      newSuggestions.push({
        id: 'month-streak',
        title: 'Monthly Champion',
        description: `Check in ${30 - stats.checkinStreak} more days to reach a 30-day streak`,
        icon: '🏆',
        xpReward: XP_VALUES.STREAK_MILESTONE_30,
        progress: stats.checkinStreak,
        maxProgress: 30,
        category: 'milestone',
        difficulty: 'hard',
        estimatedTime: '3 weeks',
        actionUrl: '/checkin'
      })
    }

    // Badge Collection
    if (stats.badgesEarned < 5) {
      newSuggestions.push({
        id: 'badge-collector',
        title: 'Badge Collector',
        description: `Earn ${5 - stats.badgesEarned} more badges to become a collector`,
        icon: '🏅',
        xpReward: 0, // Badges don't give XP directly
        progress: stats.badgesEarned,
        maxProgress: 5,
        category: 'milestone',
        difficulty: 'medium',
        estimatedTime: '1-2 weeks',
        actionUrl: '/profile'
      })
    }

    // Sort by difficulty and progress
    newSuggestions.sort((a, b) => {
      const difficultyOrder = { easy: 1, medium: 2, hard: 3 }
      const progressRatioA = a.progress / a.maxProgress
      const progressRatioB = b.progress / b.maxProgress
      
      // Prioritize easy tasks that are close to completion
      if (difficultyOrder[a.difficulty] !== difficultyOrder[b.difficulty]) {
        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
      }
      
      return progressRatioB - progressRatioA
    })

    setSuggestions(newSuggestions.slice(0, 6)) // Show top 6 suggestions
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'content': return <MessageSquare className="h-4 w-4" />
      case 'social': return <Heart className="h-4 w-4" />
      case 'engagement': return <Users className="h-4 w-4" />
      case 'milestone': return <Trophy className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-lg">Loading suggestions...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!userStats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Failed to load suggestions
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>What's Next?</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Complete these activities to earn XP and unlock achievements!
          </p>
          
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm">You've completed all available suggestions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="text-2xl">{suggestion.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium">{suggestion.title}</h3>
                          <Badge className={getDifficultyColor(suggestion.difficulty)}>
                            {suggestion.difficulty}
                          </Badge>
                          <div className="flex items-center space-x-1 text-gray-500">
                            {getCategoryIcon(suggestion.category)}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {suggestion.description}
                        </p>
                        
                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">
                              {suggestion.progress} / {suggestion.maxProgress}
                            </span>
                          </div>
                          <Progress 
                            value={(suggestion.progress / suggestion.maxProgress) * 100} 
                            className="h-2"
                          />
                        </div>

                        {/* XP Reward and Time */}
                        <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            {suggestion.xpReward > 0 && (
                              <div className="flex items-center space-x-1">
                                <Zap className="h-4 w-4 text-yellow-500" />
                                <span>+{suggestion.xpReward} XP</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 text-blue-500" />
                              <span>{suggestion.estimatedTime}</span>
                            </div>
                          </div>
                          {suggestion.actionUrl && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={suggestion.actionUrl}>
                                Get Started
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

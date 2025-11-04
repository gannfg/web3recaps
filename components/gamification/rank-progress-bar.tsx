"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Trophy, Star, Target } from 'lucide-react'
import { RANK_THRESHOLDS } from '@/lib/types'

interface RankProgressBarProps {
  currentXp: number
  currentRank: string
  currentLevel: number
  className?: string
  showDetails?: boolean
}

export function RankProgressBar({ 
  currentXp, 
  currentRank, 
  currentLevel, 
  className = "",
  showDetails = true 
}: RankProgressBarProps) {
  // Find current rank index
  const currentRankIndex = RANK_THRESHOLDS.findIndex(rank => rank.name === currentRank)
  const currentRankData = RANK_THRESHOLDS[currentRankIndex]
  const nextRankData = RANK_THRESHOLDS[currentRankIndex + 1]

  // Calculate progress
  const currentRankXp = currentRankData?.minXp || 0
  const nextRankXp = nextRankData?.minXp || currentRankXp + 1000
  const xpInCurrentRank = currentXp - currentRankXp
  const xpNeededForNextRank = nextRankXp - currentRankXp
  const progressPercentage = Math.min((xpInCurrentRank / xpNeededForNextRank) * 100, 100)
  const xpToNextRank = Math.max(nextRankXp - currentXp, 0)

  // Check if user is at max rank
  const isMaxRank = currentRankIndex === RANK_THRESHOLDS.length - 1

  const getRankIcon = (rankName: string) => {
    switch (rankName) {
      case 'Newcomer': return '🌱'
      case 'Explorer': return '🔍'
      case 'Contributor': return '🤝'
      case 'Builder': return '🔨'
      case 'Expert': return '🎯'
      case 'Master': return '👑'
      case 'Legend': return '⭐'
      case 'Champion': return '🏆'
      case 'Elite': return '💎'
      case 'Supreme': return '👑'
      default: return '⭐'
    }
  }

  const getRankColor = (rankName: string) => {
    switch (rankName) {
      case 'Newcomer': return 'bg-gray-500'
      case 'Explorer': return 'bg-green-500'
      case 'Contributor': return 'bg-blue-500'
      case 'Builder': return 'bg-orange-500'
      case 'Expert': return 'bg-purple-500'
      case 'Master': return 'bg-yellow-500'
      case 'Legend': return 'bg-pink-500'
      case 'Champion': return 'bg-red-500'
      case 'Elite': return 'bg-indigo-500'
      case 'Supreme': return 'bg-gradient-to-r from-yellow-400 to-yellow-600'
      default: return 'bg-gray-500'
    }
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Current Rank Display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {getRankIcon(currentRank)}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{currentRank}</h3>
                  <p className="text-sm text-gray-600">Level {currentLevel}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{currentXp.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Total XP</p>
              </div>
            </div>

            {/* Progress Bar */}
            {!isMaxRank ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress to {nextRankData?.name}</span>
                  <span className="font-medium">{Math.round(progressPercentage)}%</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full">
                      <Progress 
                        value={progressPercentage} 
                        className="h-3"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{xpInCurrentRank.toLocaleString()} / {xpNeededForNextRank.toLocaleString()} XP</p>
                    <p>{xpToNextRank.toLocaleString()} XP to next rank</p>
                  </TooltipContent>
                </Tooltip>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{currentRankXp.toLocaleString()}</span>
                  <span>{nextRankXp.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl mb-2">🏆</div>
                <p className="font-semibold text-lg">Max Rank Achieved!</p>
                <p className="text-sm text-gray-600">You've reached the highest rank</p>
              </div>
            )}

            {/* Next Rank Preview */}
            {!isMaxRank && showDetails && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="text-lg">
                      {getRankIcon(nextRankData?.name || '')}
                    </div>
                    <div>
                      <p className="font-medium text-sm">Next: {nextRankData?.name}</p>
                      <p className="text-xs text-gray-600">
                        {xpToNextRank.toLocaleString()} XP needed
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {nextRankData?.minXp.toLocaleString()} XP
                  </Badge>
                </div>
              </div>
            )}

            {/* Level Progress */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span className="text-gray-600">Level Progress</span>
                </div>
                <span className="font-medium">
                  {currentXp % 100} / 100 XP
                </span>
              </div>
              <Progress 
                value={(currentXp % 100)} 
                className="h-2 mt-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Level {currentLevel}</span>
                <span>Level {currentLevel + 1}</span>
              </div>
            </div>

            {/* Quick Stats */}
            {showDetails && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{currentLevel}</p>
                  <p className="text-xs text-gray-600">Current Level</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {!isMaxRank ? xpToNextRank.toLocaleString() : '∞'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {!isMaxRank ? 'XP to Next Rank' : 'Max Rank'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

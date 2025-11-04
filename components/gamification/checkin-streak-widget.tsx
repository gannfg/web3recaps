"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { Flame, Star, Calendar, Trophy } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface CheckinData {
  canCheckIn: boolean
  streak: number
  todayCheckedIn: boolean
  xpEarned: number
  nextMilestone: number
}

export function CheckinStreakWidget() {
  const { user, setUser } = useSession()
  const { execute } = useApi()
  const { toast } = useToast()
  const [checkinData, setCheckinData] = useState<CheckinData>({
    canCheckIn: true,
    streak: 0,
    todayCheckedIn: false,
    xpEarned: 0,
    nextMilestone: 7,
  })
  const [isChecking, setIsChecking] = useState(false)
  const [showXpAnimation, setShowXpAnimation] = useState(false)

  const loadCheckinData = async () => {
    if (!user) return

    const result = await execute("/api/checkin/status", {
      headers: {
        "x-user-id": user.id,
      },
    })

    if (result.success && result.data) {
      setCheckinData(result.data)
    }
  }

  useEffect(() => {
    loadCheckinData()
  }, [user])

  const handleCheckIn = async () => {
    if (!user || isChecking) return

    setIsChecking(true)

    try {
      const result = await execute("/api/checkin/daily", {
        method: "POST",
        headers: {
          "x-user-id": user.id,
        },
      })

      if (result.success && result.data) {
        setCheckinData(result.data.checkinData)
        setUser(result.data.user)

        // Show XP animation
        setShowXpAnimation(true)
        setTimeout(() => setShowXpAnimation(false), 2000)

        toast({
          title: "Daily check-in complete! 🔥",
          description: `You earned ${result.data.xpEarned} XP! Current streak: ${result.data.checkinData.streak} days`,
        })

        // Check for streak milestones
        if (result.data.checkinData.streak % 7 === 0 && result.data.checkinData.streak > 0) {
          toast({
            title: "Streak milestone reached! 🏆",
            description: `${result.data.checkinData.streak} day streak! Keep it up!`,
          })
        }
      }
    } catch (error) {
      toast({
        title: "Check-in failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsChecking(false)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Connect your wallet to start your daily streak</p>
        </CardContent>
      </Card>
    )
  }

  const streakProgress = (checkinData.streak % 7) / 7
  const daysUntilMilestone = 7 - (checkinData.streak % 7)

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Daily Check-in
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-bold">{checkinData.streak}</span>
            <div className="text-left">
              <p className="text-sm font-medium">Day Streak</p>
              <p className="text-xs text-muted-foreground">Keep it going!</p>
            </div>
          </div>

          {checkinData.streak > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Next milestone</span>
                <span>{daysUntilMilestone} days to go</span>
              </div>
              <Progress value={streakProgress * 100} className="h-2" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => {
            const dayIndex = i + 1
            const isActive = dayIndex <= checkinData.streak % 7 || checkinData.streak >= 7
            const isToday = dayIndex === (checkinData.streak % 7 || 7)

            return (
              <div
                key={i}
                className={`aspect-square rounded-full flex items-center justify-center text-xs font-medium ${
                  isActive
                    ? isToday
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {dayIndex}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>+10 XP daily</span>
          </div>
          {checkinData.streak >= 7 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              Week Warrior
            </Badge>
          )}
        </div>

        <Button
          onClick={handleCheckIn}
          disabled={checkinData.todayCheckedIn || isChecking}
          className="w-full"
          size="lg"
        >
          {isChecking ? "Checking in..." : checkinData.todayCheckedIn ? "Checked in today ✓" : "Check in now"}
        </Button>

        {checkinData.todayCheckedIn && (
          <div className="text-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 inline mr-1" />
            Come back tomorrow to continue your streak!
          </div>
        )}
      </CardContent>

      {/* XP Animation */}
      <AnimatePresence>
        {showXpAnimation && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: -20, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.8 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-bold text-sm">
              +{checkinData.xpEarned} XP
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

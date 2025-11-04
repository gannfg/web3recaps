"use client"

import type { User } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, MapPin, Calendar, LinkIcon, Star, Trophy, QrCode, Wallet } from "lucide-react"
import { BadgePill } from "@/components/gamification/badge-pill"
import { CheckInButton } from "@/components/checkin/checkin-button"

interface ProfileHeaderProps {
  user: User
  isOwnProfile?: boolean
  onEditClick?: () => void
}

export function ProfileHeader({ user, isOwnProfile = false, onEditClick }: ProfileHeaderProps) {
  const getRankColor = (rank: string) => {
    switch (rank) {
      case "Solana Legend":
        return "text-yellow-500"
      case "Master":
        return "text-purple-500"
      case "Expert":
        return "text-blue-500"
      case "Leader":
        return "text-green-500"
      case "Innovator":
        return "text-orange-500"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Banner */}
      <div className="h-48 sm:h-64 relative overflow-hidden rounded-b-lg">
        {user.bannerUrl ? (
          <img 
            src={user.bannerUrl} 
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <div className="w-full h-full bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20" />
            <div className="absolute inset-0 bg-gradient-to-br from-background/5 via-transparent to-background/5" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-primary/5 to-transparent" />
          </>
        )}
        
        {/* Action buttons positioned in banner */}
        {isOwnProfile && (
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <CheckInButton user={user} />
            <Button variant="secondary" size="sm" onClick={onEditClick} className="backdrop-blur-sm bg-background/80">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        )}
      </div>

      {/* Profile Content */}
      <div className="relative px-4 pb-4">
        {/* Avatar - positioned to overlap banner */}
        <div className="relative -mt-16 sm:-mt-20 mb-4">
          <Avatar className="h-32 w-32 sm:h-40 sm:w-40 border-4 border-background shadow-xl">
            <AvatarImage 
              src={user.avatarUrl || "/placeholder.svg"} 
              alt={user.displayName}
              className="object-cover object-center"
            />
            <AvatarFallback className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-primary to-secondary text-primary-foreground">
              {user.displayName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* User Info */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{user.displayName || "Anonymous User"}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={`${getRankColor(user.rank)} border-current`}>
                <Trophy className="h-3 w-3 mr-1" />
                {user.rank}
              </Badge>
              <Badge variant="outline" className="text-primary border-primary">
                <Star className="h-3 w-3 mr-1" />
                Level {user.level}
              </Badge>
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">{user.bio}</p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {user.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{user.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Social Links */}
          {user.socialLinks && Object.entries(user.socialLinks).some(([_, url]) => url) && (
            <div className="flex items-center gap-1 flex-wrap">
              <LinkIcon className="h-4 w-4 text-muted-foreground mr-1" />
              {Object.entries(user.socialLinks).map(([platform, url]) =>
                url ? (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline capitalize text-sm"
                  >
                    {platform}
                  </a>
                ) : null,
              ).reduce((prev, curr, index) => index === 0 ? [curr] : [...prev, <span key={index} className="text-muted-foreground mx-1">•</span>, curr], [] as React.ReactNode[])}
            </div>
          )}

          {/* Stats */}
          <div className="flex flex-wrap gap-6 pt-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{user.totalXp?.toLocaleString() || 0}</span>
              <span className="text-muted-foreground text-sm">XP</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{user.checkinStreak || 0}</span>
              <span className="text-muted-foreground text-sm">day streak</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{user.badges?.length || 0}</span>
              <span className="text-muted-foreground text-sm">badges</span>
            </div>
          </div>

          {/* Skills */}
          {user.skills && user.skills.length > 0 && (
            <div className="pt-2">
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs hover:bg-secondary/80 transition-colors">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recent Badges */}
          {user.badges && user.badges.length > 0 && (
            <div className="pt-2">
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">Recent Achievements</h3>
              <div className="flex flex-wrap gap-2">
                {user.badges.slice(0, 6).map((badge) => (
                  <BadgePill
                    key={badge.id}
                    badge={{
                      ...badge,
                      badgeName: badge.name,
                      unlockedAt: badge.unlockedAt || new Date().toISOString(),
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

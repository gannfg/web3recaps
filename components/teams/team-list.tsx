"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { Team } from "@/lib/types"
import { formatRelativeTime } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type TeamSummary = {
  id: string
  name: string
  description?: string | null
  avatarUrl?: string | null
  projectType?: Team["projectType"]
  status?: Team["status"]
  location?: Team["location"]
  skills?: string[]
  tags?: string[]
  createdAt?: string
  totalXp?: number
  teamLevel?: number
  currentMemberCount?: number | null
  maxMembers?: number | null
}

export function TeamListSection() {
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<TeamSummary | null>(null)

  useEffect(() => {
    let ignore = false

    const loadTeams = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/public/teams?limit=12", { cache: "no-store" })
        if (!res.ok) {
          throw new Error(`Teams request failed: ${res.status}`)
        }

        const json = await res.json()
        if (!ignore && json.success && Array.isArray(json.data)) {
          setTeams(json.data)
        } else if (!ignore) {
          setError(json.error || "Unable to load teams")
        }
      } catch (err) {
        console.error("Team list load error:", err)
        if (!ignore) {
          setError("We couldn’t load the latest teams. Please check back soon.")
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadTeams()
    const interval = setInterval(loadTeams, 120000)

    return () => {
      ignore = true
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Card key={idx} className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-dashed bg-muted/40">
        <CardHeader>
          <CardTitle>Teams unavailable</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (teams.length === 0) {
    return (
      <Card className="border-dashed bg-muted/40">
        <CardHeader>
          <CardTitle>No teams yet</CardTitle>
          <CardDescription>
            Be the first to create a team and kick off a new project with the community.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <Card
            key={team.id}
            className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
            onClick={() => setSelectedTeam(team)}
          >
            <div className="flex items-start gap-3 p-4 pb-2">
              <Avatar className="h-12 w-12">
                <AvatarImage src={team.avatarUrl || undefined} alt={team.name} />
                <AvatarFallback>{team.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold truncate">{team.name}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {team.description || "No description provided"}
                </p>
              </div>
            </div>
            <CardContent className="space-y-4 pt-0">
              {team.skills && team.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {team.skills.slice(0, 3).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {team.skills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{team.skills.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>
                    {team.currentMemberCount ?? "—"}
                    {team.maxMembers ? `/${team.maxMembers}` : ""}
                  </span>
                </div>
                {team.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate max-w-[120px]">{team.location}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {team.status ? (
                  <Badge variant={team.status === "recruiting" ? "default" : "secondary"} className="text-xs capitalize">
                    {team.status}
                  </Badge>
                ) : (
                  <span />
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {team.createdAt ? formatRelativeTime(team.createdAt) : "Recently added"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <TeamDetailsDialog team={selectedTeam} onOpenChange={(open) => (!open ? setSelectedTeam(null) : undefined)} />
    </div>
  )
}

function TeamDetailsDialog({
  team,
  onOpenChange,
}: {
  team: TeamSummary | null
  onOpenChange: (open: boolean) => void
}) {
  if (!team) return null

  const handleOpenChange = (open: boolean) => {
    if (!open) onOpenChange(false)
  }

  const primaryLink = team.tags?.find((tag) => tag.startsWith("http"))

  return (
    <Dialog open={!!team} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={team.avatarUrl || undefined} alt={team.name} />
              <AvatarFallback>{team.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="space-y-1 min-w-0">
              <DialogTitle className="text-2xl font-semibold leading-tight truncate">
                {team.name}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                {team.description || "No description provided yet."}
              </DialogDescription>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {team.status && (
                  <Badge variant={team.status === "recruiting" ? "default" : "secondary"} className="capitalize">
                    {team.status}
                  </Badge>
                )}
                {typeof team.currentMemberCount === "number" && (
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                    <Users className="h-3 w-3" />
                    {team.currentMemberCount}
                    {team.maxMembers ? `/${team.maxMembers}` : ""}
                  </span>
                )}
                {team.location && (
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                    <MapPin className="h-3 w-3" />
                    {team.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {team.skills && team.skills.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">Skills</p>
              <div className="flex flex-wrap gap-2">
                {team.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
            {team.projectType && (
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-semibold tracking-wide">Type</span>
                <span className="font-medium text-foreground capitalize">{team.projectType}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-semibold tracking-wide">Created</span>
              <span className="font-medium text-foreground">
                {team.createdAt ? formatRelativeTime(team.createdAt) : "Recently"}
              </span>
            </div>
            {typeof team.totalXp === "number" && (
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-semibold tracking-wide">XP</span>
                <span className="font-medium text-foreground">{team.totalXp.toLocaleString()}</span>
              </div>
            )}
            {typeof team.teamLevel === "number" && (
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-semibold tracking-wide">Level</span>
                <span className="font-medium text-foreground">Level {team.teamLevel}</span>
              </div>
            )}
          </div>

          {team.tags && team.tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">Tags</p>
              <div className="flex flex-wrap gap-2">
                {team.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="capitalize text-xs">
                    {tag.replace(/^https?:\/\//, "")}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {primaryLink && (
            <Button variant="secondary" onClick={() => window.open(primaryLink, "_blank", "noopener,noreferrer")}>
              Visit Link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


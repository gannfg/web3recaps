"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { formatRelativeTime } from "@/lib/utils"
import { Users, Calendar, MapPin, ExternalLink, Github, Figma, MoreHorizontal, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import type { Team, User } from "@/lib/types"

interface TeamCardProps {
  team: Team & {
    members?: Array<{
      id: string
      role: string
      user: {
        id: string
        display_name?: string
        avatar_url?: string
      }
    }>
  }
  onJoin?: (teamId: string) => void
  onLeave?: (teamId: string) => void
  onDelete?: (teamId: string) => void
}

const TEAM_STATUS_COLORS = {
  recruiting: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  archived: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
}

const TEAM_STATUS_LABELS = {
  recruiting: "Recruiting",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
}

export function TeamCard({ team, onJoin, onLeave, onDelete }: TeamCardProps) {
  const { user } = useSession()
  const { execute } = useApi()
  const { toast } = useToast()
  const [isJoining, setIsJoining] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const members = team.members || []
  const leader = members.find(m => m.role === 'leader')
  const isMember = members.some((member) => member.user.id === user?.id)
  const isLeader = leader?.user.id === user?.id
  const canJoin = team.status === "recruiting" && !isMember && members.length < team.maxMembers

  if (!team) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            <p>Loading team...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleJoinLeave = async () => {
    if (!user) return

    setIsJoining(true)
    const endpoint = isMember ? `/api/teams/${team.id}/leave` : `/api/teams/${team.id}/join`

    const result = await execute(endpoint, {
      method: "POST",
    })

    if (result.success) {
      if (isMember) {
        onLeave?.(team.id)
      } else {
        onJoin?.(team.id)
      }
    }

    setIsJoining(false)
  }

  const handleDeleteTeam = async () => {
    if (!user || !isLeader) return

    setIsDeleting(true)
    
    try {
      const result = await execute(`/api/teams/${team.id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": user.id,
        },
      })

      if (result.success) {
        console.log("Team deletion successful, calling onDelete callback")
        toast({
          title: "Team deleted",
          description: "The team has been successfully deleted.",
        })
        setShowDeleteDialog(false)
        onDelete?.(team.id)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete team",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting team:", error)
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive",
      })
      setShowDeleteDialog(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={leader?.user?.avatar_url || "/placeholder.svg"} />
              <AvatarFallback>{leader?.user?.display_name?.charAt(0) || "T"}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{team.name}</h3>
                <Badge className={TEAM_STATUS_COLORS[team.status]} variant="secondary">
                  {TEAM_STATUS_LABELS[team.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Led by {leader?.user?.display_name || "Anonymous"}</span>
                <span>•</span>
                <span>{formatRelativeTime(team.createdAt)}</span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Share Team</DropdownMenuItem>
              <DropdownMenuItem>Report</DropdownMenuItem>
              {isLeader && (
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600"
                  onSelect={(e) => {
                    e.preventDefault()
                    setShowDeleteDialog(true)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Team
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="text-pretty">{team.description}</p>
        </div>

        {/* Team Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {members.length}/{team.maxMembers} members
            </span>
          </div>
          {team.timeline && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{team.timeline}</span>
            </div>
          )}
          {team.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{team.location}</span>
            </div>
          )}
        </div>

        {/* Skills Required */}
        {team.skillsRequired && team.skillsRequired.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Skills Required:</p>
            <div className="flex flex-wrap gap-2">
              {team.skillsRequired.map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {(team.githubUrl || team.figmaUrl || team.websiteUrl) && (
          <div className="flex flex-wrap gap-2">
            {team.githubUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={team.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
            {team.figmaUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={team.figmaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <Figma className="h-4 w-4" />
                  Figma
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
            {team.websiteUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={team.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Website
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Team Members */}
        {members.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Team Members:</p>
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((member) => (
                <Avatar key={member.user.id} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={member.user.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback className="text-xs">{member.user.display_name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              ))}
              {members.length > 5 && (
                <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-xs font-medium">+{members.length - 5}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {canJoin && (
              <Button onClick={handleJoinLeave} disabled={isJoining}>
                {isJoining ? "Joining..." : "Join Team"}
              </Button>
            )}
            {isMember && !isLeader && (
              <Button variant="outline" onClick={handleJoinLeave} disabled={isJoining}>
                {isJoining ? "Leaving..." : "Leave Team"}
              </Button>
            )}
            {isLeader && (
              <Button variant="outline" asChild>
                <a href={`/teams/${team.id}/manage`}>Manage Team</a>
              </Button>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <a href={`/teams/${team.id}`}>View Details</a>
          </Button>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{team.name}"? This action cannot be undone. 
              All team data, members, and projects will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTeam}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Team"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

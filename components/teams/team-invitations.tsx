"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useApi } from "@/hooks/use-api"
import { useSession } from "@/store/useSession"
import { useToast } from "@/hooks/use-toast"
import { formatRelativeTime } from "@/lib/utils"
import { Mail, Users, Calendar, CheckCircle, XCircle, Loader2 } from "lucide-react"

interface TeamInvitation {
  id: string
  team_id: string
  inviter_id: string
  invitee_id: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  role: string
  message?: string
  expires_at: string
  created_at: string
  team: {
    id: string
    name: string
    description: string
    avatar_url?: string
    project_type: string
    max_members: number
  }
  inviter: {
    id: string
    display_name: string
    avatar_url?: string
  }
}

export function TeamInvitations() {
  const { user } = useSession()
  const { execute } = useApi()
  const { toast } = useToast()
  
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadInvitations()
    }
  }, [user])

  const loadInvitations = async () => {
    setLoading(true)
    try {
      const result = await execute("/api/users/me/invitations")
      if (result.success && result.data) {
        setInvitations(result.data)
      }
    } catch (error) {
      console.error("Failed to load invitations:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleResponse = async (invitationId: string, action: 'accept' | 'decline') => {
    setRespondingTo(invitationId)
    try {
      const result = await execute(`/api/invitations/${invitationId}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      })

      if (result.success) {
        toast({
          title: action === 'accept' ? "Invitation Accepted!" : "Invitation Declined",
          description: result.data?.message || `Successfully ${action}ed the invitation`,
        })
        
        // Remove the invitation from the list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      } else {
        toast({
          title: "Error",
          description: result.error || `Failed to ${action} invitation`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(`Failed to ${action} invitation:`, error)
      toast({
        title: "Error",
        description: `Failed to ${action} invitation`,
        variant: "destructive",
      })
    } finally {
      setRespondingTo(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Team Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Team Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No pending invitations</p>
            <p className="text-sm text-muted-foreground mt-1">
              Team invitations will appear here when you receive them
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Team Invitations ({invitations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="border rounded-lg p-4 space-y-4">
              {/* Team Info */}
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={invitation.team.avatar_url} />
                  <AvatarFallback>
                    {invitation.team.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{invitation.team.name}</h3>
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {invitation.team.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {invitation.team.max_members} max members
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {invitation.team.project_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Invitation Details */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={invitation.inviter.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {invitation.inviter.display_name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    <span className="font-medium">{invitation.inviter.display_name}</span>
                    {' invited you to join as '}
                    <Badge variant="secondary" className="capitalize">
                      {invitation.role.replace('_', ' ')}
                    </Badge>
                  </span>
                </div>
                
                {invitation.message && (
                  <p className="text-sm italic text-muted-foreground mb-2">
                    "{invitation.message}"
                  </p>
                )}
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Invited {formatRelativeTime(invitation.created_at)} • 
                  Expires {formatRelativeTime(invitation.expires_at)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleResponse(invitation.id, 'accept')}
                  disabled={respondingTo === invitation.id}
                  className="flex-1"
                >
                  {respondingTo === invitation.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Accept
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleResponse(invitation.id, 'decline')}
                  disabled={respondingTo === invitation.id}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

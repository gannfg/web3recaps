"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/store/useSession"
import { ProfileHeader } from "@/components/profile/profile-header"
import { ProfileEditForm } from "@/components/profile/profile-edit-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useApi } from "@/hooks/use-api"
import { BadgePill } from "@/components/gamification/badge-pill"
import { AchievementsDisplay } from "@/components/gamification/achievements-display"
import { KycStatusCard } from "@/components/profile/kyc-status-card"
import { KycUploadForm } from "@/components/profile/kyc-upload-form"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Crown, Calendar, MapPin, ExternalLink, UserPlus, Check, X, FileText, Calendar as CalendarIcon, UserCheck, Award, Clock, Shield, Plus } from "lucide-react"
import Link from "next/link"
import type { Team, TeamMember, TeamInvitation } from "@/lib/types"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ProjectCreateForm } from "@/components/projects/project-create-form"

export default function ProfilePage() {
  const { user, setUser } = useSession()
  const { toast } = useToast()
  const { execute } = useApi()
  const [isEditing, setIsEditing] = useState(false)
  const [posts, setPosts] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])
  const [userTeams, setUserTeams] = useState<(Team & { memberInfo: TeamMember })[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [selectedTeamForProject, setSelectedTeamForProject] = useState<Team | null>(null)

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      // Use the original profile API that works
      const result = await execute("/api/users/me")
      
      if (result.success && result.data) {
        setUser(result.data.user) // Update session store
        setPosts(result.data.posts || [])
        setEvents(result.data.events || [])
        setProjects(result.data.projects || [])
        setAchievements(result.data.achievements || [])
        
        // Fetch user's teams and invitations
        await Promise.all([
          fetchUserTeams(result.data.user.id),
          fetchUserInvitations()
        ])
      } else {
        console.error("Failed to fetch user profile:", result.error)
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserTeams = async (userId: string) => {
    try {
      const result = await execute(`/api/teams?member=${userId}`, {
        headers: { "x-user-id": userId }
      })
      if (result.success && result.data) {
        setUserTeams(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch user teams:", error)
    }
  }

  const fetchUserInvitations = async () => {
    try {
      const result = await execute("/api/users/me/invitations")
      if (result.success && result.data) {
        setInvitations(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch user invitations:", error)
    }
  }

  const handleInvitationAction = async (invitationId: string, action: 'accept' | 'decline') => {
    try {
      const result = await execute(`/api/users/me/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      })

      if (result.success) {
        toast({
          title: action === 'accept' ? "Invitation Accepted!" : "Invitation Declined",
          description: action === 'accept' 
            ? "You've joined the team successfully!" 
            : "You've declined the invitation.",
        })
        
        // Refresh invitations and teams
        await Promise.all([
          fetchUserInvitations(),
          fetchUserTeams(user?.id || "")
        ])
      } else {
        throw new Error(result.error || "Failed to process invitation")
      }
    } catch (error) {
      console.error("Failed to process invitation:", error)
      toast({
        title: "Error",
        description: "Failed to process invitation",
        variant: "destructive",
      })
    }
  }

  const fetchUserActivities = async () => {}

  const handleSaveProfile = async (updatedData: any) => {
    console.log("Saving profile data:", updatedData)
    const result = await execute("/api/users/me", { 
      method: "PATCH", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify(updatedData) 
    })
    
    console.log("Profile save result:", result)
    
    if (result.success && result.data) {
      setUser(result.data.user) // Update session store
      setIsEditing(false)
    } else {
      throw new Error(result.error || "Failed to update profile")
    }
  }

  if (!user && !loading) {
    return (
      <div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Please log in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-muted rounded-lg" />
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Profile not found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      {isEditing ? (
        <div className="max-w-4xl mx-auto">
          <ProfileEditForm user={user} onSave={handleSaveProfile} onCancel={() => setIsEditing(false)} />
        </div>
      ) : (
        <>
          <ProfileHeader user={user} isOwnProfile={true} onEditClick={() => setIsEditing(true)} />

          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-6 h-auto p-1">
                <TabsTrigger value="posts" className="flex flex-col gap-1 h-auto py-2 px-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">Posts</span>
                </TabsTrigger>
                <TabsTrigger value="events" className="flex flex-col gap-1 h-auto py-2 px-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">Events</span>
                </TabsTrigger>
                <TabsTrigger value="teams" className="flex flex-col gap-1 h-auto py-2 px-2">
                  <Users className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">Teams</span>
                </TabsTrigger>
                <TabsTrigger value="invitations" className="flex flex-col gap-1 h-auto py-2 px-2">
                  <UserCheck className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">Invitations</span>
                </TabsTrigger>
                <TabsTrigger value="verification" className="flex flex-col gap-1 h-auto py-2 px-2">
                  <Shield className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">Verification</span>
                </TabsTrigger>
                <TabsTrigger value="achievements" className="flex flex-col gap-1 h-auto py-2 px-2">
                  <Award className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">Achievements</span>
                </TabsTrigger>
              </TabsList>

            <TabsContent value="posts" className="space-y-4">
              {posts.length === 0 ? (
                <div className="text-muted-foreground text-sm">No posts yet.</div>
              ) : (
                posts.map((p) => (
                  <div key={p.id} className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</div>
                    {p.title && <h3 className="font-semibold mt-1">{p.title}</h3>}
                    <p className="mt-1">{p.content}</p>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              {events.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Events Created</h3>
                    <p className="text-muted-foreground mb-6">
                      You haven't created any events yet. Start organizing your first event!
                    </p>
                    <Button asChild>
                      <Link href="/events?create=true">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Create Event
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {events.map((event) => (
                    <Card key={event.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex gap-3">
                          {/* Event Image */}
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                              {event.bannerImage || event.coverImage || event.logoImage ? (
                                <img
                                  src={event.bannerImage || event.coverImage || event.logoImage}
                                  alt={event.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <CalendarIcon className="h-6 w-6" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Event Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col gap-2 mb-2">
                              <h3 className="text-base font-semibold truncate leading-tight">{event.title}</h3>
                              <div className="flex flex-wrap items-center gap-1">
                                <Badge variant="outline" className="capitalize text-xs px-2 py-0.5">
                                  {event.eventType?.replace('_', ' ') || 'Event'}
                                </Badge>
                                <Badge 
                                  variant={event.status === 'published' ? 'default' : 
                                          event.status === 'draft' ? 'secondary' : 'destructive'}
                                  className="text-xs capitalize px-2 py-0.5"
                                >
                                  {event.status}
                                </Badge>
                              </div>
                            </div>

                            {event.description && (
                              <p className="text-muted-foreground text-xs line-clamp-2 mb-2 leading-relaxed">
                                {event.description}
                              </p>
                            )}

                            <div className="space-y-1 mb-3">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{new Date(event.eventDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{event.startTime} - {event.endTime}</span>
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{event.currentAttendeesCount || 0} attendees</span>
                                {event.maxAttendees && (
                                  <span>Max {event.maxAttendees}</span>
                                )}
                              </div>
                              <Button size="sm" asChild className="h-7 px-3 text-xs">
                                <Link href={`/events/${event.id}`}>
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="teams" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">My Teams ({userTeams.length})</h2>
                <Button asChild>
                  <Link href="/teams">
                    <Users className="h-4 w-4 mr-2" />
                    Browse Teams
                  </Link>
                </Button>
              </div>

              <Dialog
                open={showCreateProject}
                onOpenChange={(open) => {
                  setShowCreateProject(open)
                  if (!open) setSelectedTeamForProject(null)
                }}
              >
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  {selectedTeamForProject && (
                    <ProjectCreateForm
                      team={selectedTeamForProject}
                      onProjectCreated={() => {
                        setShowCreateProject(false)
                        setSelectedTeamForProject(null)
                      }}
                      onCancel={() => {
                        setShowCreateProject(false)
                        setSelectedTeamForProject(null)
                      }}
                    />
                  )}
                </DialogContent>
              </Dialog>

              {userTeams.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <div className="text-4xl mb-4">👥</div>
                    <h3 className="text-lg font-semibold mb-2">No Teams Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Join or create a team to start collaborating with other builders!
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button asChild>
                        <Link href="/teams">Browse Teams</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/teams?create=true">Create Team</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {userTeams.map((team) => {
                    const memberInfo = team.memberInfo
                    const isLeader = memberInfo?.role === 'leader' || team.createdBy === user?.id
                    
                    return (
                      <Card key={team.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar className="h-12 w-12 flex-shrink-0">
                                <AvatarImage src={team.avatarUrl} className="object-cover" />
                                <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                                  {team.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h3 className="text-lg font-semibold truncate">{team.name}</h3>
                                  {isLeader && (
                                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 text-xs">
                                      <Crown className="h-3 w-3 mr-1" />
                                      Leader
                                    </Badge>
                                  )}
                                  {memberInfo && memberInfo.role !== 'leader' && (
                                    <Badge variant="secondary" className="capitalize text-xs">
                                      {memberInfo.role.replace('_', ' ')}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-muted-foreground text-sm line-clamp-2">
                                  {team.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
                                <Link href={`/teams/${team.id}`}>
                                  <ExternalLink className="h-4 w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">View</span>
                                </Link>
                              </Button>
                              {isLeader && (
                                <>
                                  <Button size="sm" asChild className="flex-1 sm:flex-none">
                                    <Link href={`/teams/${team.id}/manage`}>
                                      <span className="hidden sm:inline">Manage</span>
                                      <span className="sm:hidden">Manage</span>
                                    </Link>
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="flex-1 sm:flex-none"
                                    onClick={() => {
                                      setSelectedTeamForProject(team)
                                      setShowCreateProject(true)
                                    }}
                                  >
                                    <Plus className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">New Project</span>
                                    <span className="sm:hidden">New</span>
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Team Stats */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{team.currentMemberCount}/{team.maxMembers} members</span>
                            </div>
                            {team.timeline && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{team.timeline}</span>
                              </div>
                            )}
                            {team.location && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                <span className="capitalize truncate">{team.location}</span>
                              </div>
                            )}
                            {team.projectType && (
                              <div className="text-muted-foreground">
                                <Badge variant="outline" className="text-xs capitalize">
                                  {team.projectType.replace('_', ' ')}
                                </Badge>
                              </div>
                            )}
                          </div>

                          {/* Skills */}
                          {team.skills && team.skills.length > 0 && (
                            <div className="mb-4">
                              <p className="text-sm font-medium mb-2">Team Skills:</p>
                              <div className="flex flex-wrap gap-2">
                                {team.skills.slice(0, 6).map((skill) => (
                                  <Badge key={skill} variant="default" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {team.skills.length > 6 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{team.skills.length - 6} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Member Since */}
                          {memberInfo && (
                            <div className="text-xs text-muted-foreground">
                              Member since {new Date(memberInfo.joinedAt).toLocaleDateString()}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="invitations" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Team Invitations ({invitations.length})</h2>
              </div>

              {invitations.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Invitations</h3>
                    <p className="text-muted-foreground">
                      You don't have any pending team invitations at the moment.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <Card key={invitation.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={invitation.team?.avatar_url} />
                              <AvatarFallback>
                                {invitation.team?.name?.charAt(0) || "T"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold">{invitation.team?.name}</h3>
                                <Badge variant="outline" className="capitalize">
                                  {invitation.role.replace('_', ' ')}
                                </Badge>
                                <Badge 
                                  variant={invitation.status === 'pending' ? 'default' : 
                                          invitation.status === 'accepted' ? 'secondary' : 'destructive'}
                                  className="capitalize"
                                >
                                  {invitation.status}
                                </Badge>
                              </div>
                              
                              {invitation.team?.description && (
                                <p className="text-muted-foreground text-sm mb-3">
                                  {invitation.team.description}
                                </p>
                              )}

                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  <span>Invited by {invitation.inviter?.display_name || "Unknown"}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{new Date(invitation.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>

                              {invitation.message && (
                                <div className="mt-3 p-3 bg-muted rounded-md">
                                  <p className="text-sm italic">"{invitation.message}"</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {invitation.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleInvitationAction(invitation.id, 'decline')}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleInvitationAction(invitation.id, 'accept')}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="verification" className="space-y-6">
              <div className="space-y-6">
                <KycStatusCard 
                  user={user} 
                  onResubmit={() => {
                    // Refresh the page to show the upload form
                    window.location.reload()
                  }}
                />
                
                {!user?.kycVerified && (
                  <KycUploadForm />
                )}
              </div>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              <AchievementsDisplay 
                userBadges={achievements}
                userId={user?.id || ""}
                userXp={user?.totalXp || 0}
                userPosts={posts}
                userEvents={events}
                userTeams={userTeams}
                userProjects={projects}
              />
            </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  )
}

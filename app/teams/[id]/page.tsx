"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useApi } from "@/hooks/use-api"
import { useSession } from "@/store/useSession"
import { useToast } from "@/hooks/use-toast"
import { formatRelativeTime, formatDate } from "@/lib/utils"
import {
  Users, Calendar, MapPin, ExternalLink, Github, Figma, Globe, 
  MessageCircle, Settings, UserPlus, Trophy, TrendingUp, Clock,
  Star, Award, Zap, Target, ArrowLeft
} from "lucide-react"
import type { Team, TeamMember, TeamProject, TeamAchievement } from "@/lib/types"

interface ExtendedTeam extends Team {
  members?: TeamMember[]
  projects?: TeamProject[]
  achievements?: TeamAchievement[]
}

const TEAM_STATUS_COLORS = {
  recruiting: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  archived: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
}

const PROJECT_STATUS_COLORS = {
  planning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  published: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  on_hold: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

export default function TeamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { execute } = useApi()
  const { user } = useSession()
  const { toast } = useToast()
  
  const [team, setTeam] = useState<ExtendedTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)

  const teamId = params.id as string

  useEffect(() => {
    loadTeamDetails()
  }, [teamId])

  const loadTeamDetails = async () => {
    setLoading(true)
    try {
      const result = await execute(`/api/teams/${teamId}`)
      if (result.success && result.data) {
        setTeam(result.data)
      } else {
        toast({
          title: "Team not found",
          description: "The team you're looking for doesn't exist or has been removed.",
          variant: "destructive",
        })
        router.push('/teams')
      }
    } catch (error) {
      console.error("Failed to load team:", error)
      toast({
        title: "Error loading team",
        description: "Something went wrong while loading the team details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleJoinLeave = async () => {
    if (!user || !team) return

    setIsJoining(true)
    const isMember = team.members?.some(m => m.userId === user.id)
    const endpoint = isMember ? `/api/teams/${teamId}/leave` : `/api/teams/${teamId}/join`

    try {
      const result = await execute(endpoint, {
        method: "POST",
      })

      if (result.success) {
        toast({
          title: isMember ? "Left team successfully" : "Joined team successfully",
          description: result.data?.message || (isMember ? "You have left the team" : "Welcome to the team!"),
        })
        // Reload team details to get updated member list
        await loadTeamDetails()
      } else {
        toast({
          title: "Error",
          description: result.error || "Something went wrong",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update team membership",
        variant: "destructive",
      })
    } finally {
      setIsJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-6">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-muted animate-pulse rounded-lg" />
              <div className="h-96 bg-muted animate-pulse rounded-lg" />
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-muted animate-pulse rounded-lg" />
              <div className="h-32 bg-muted animate-pulse rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="container max-w-6xl mx-auto py-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-muted-foreground">Team not found</h1>
          <p className="text-muted-foreground mt-2">The team you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/teams')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
        </div>
      </div>
    )
  }

  const members = team.members || []
  const leader = members.find(m => m.role === 'leader')
  const isMember = members.some(m => m.userId === user?.id)
  const isLeader = leader?.userId === user?.id
  const canJoin = team.status === 'recruiting' && !isMember && members.length < team.maxMembers

  return (
    <div className="container max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/teams')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Teams
        </Button>
      </div>

      {/* Team Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={team.avatarUrl || "/placeholder.svg"} />
                <AvatarFallback className="text-2xl font-bold">
                  {team.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold">{team.name}</h1>
                  <Badge className={TEAM_STATUS_COLORS[team.status]} variant="secondary">
                    {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{members.length}/{team.maxMembers} members</span>
                  </div>
                  {team.projectType && (
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      <span>{team.projectType.replace('_', ' ')}</span>
                    </div>
                  )}
                  {team.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{team.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Created {formatRelativeTime(team.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Team Level & XP */}
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Level {team.teamLevel}</span>
                <span className="text-xs text-muted-foreground">({team.totalXp} XP)</span>
              </div>

              {/* Action Buttons */}
              {!isMember && canJoin && (
                <Button onClick={handleJoinLeave} disabled={isJoining}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isJoining ? "Joining..." : "Join Team"}
                </Button>
              )}
              {isMember && !isLeader && (
                <Button variant="outline" onClick={handleJoinLeave} disabled={isJoining}>
                  {isJoining ? "Leaving..." : "Leave Team"}
                </Button>
              )}
              {isLeader && (
                <Button asChild>
                  <a href={`/teams/${teamId}/manage`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Team
                  </a>
                </Button>
              )}
              {team.discordUrl && (
                <Button variant="outline" asChild>
                  <a href={team.discordUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Discord
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {team.description && (
          <CardContent>
            <p className="text-muted-foreground">{team.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Team Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Members</p>
                        <p className="text-2xl font-bold">{members.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Projects</p>
                        <p className="text-2xl font-bold">{team.projects?.length || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Achievements</p>
                        <p className="text-2xl font-bold">{team.achievements?.length || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Skills & Requirements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {team.skills && team.skills.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Team Skills</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {team.skills.map((skill) => (
                          <Badge key={skill} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {team.skillsRequired && team.skillsRequired.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Looking For</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {team.skillsRequired.map((skill) => (
                          <Badge key={skill} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Links */}
              {(team.githubUrl || team.figmaUrl || team.websiteUrl) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Links</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {team.githubUrl && (
                        <Button variant="outline" asChild>
                          <a href={team.githubUrl} target="_blank" rel="noopener noreferrer">
                            <Github className="h-4 w-4 mr-2" />
                            GitHub
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      )}
                      {team.figmaUrl && (
                        <Button variant="outline" asChild>
                          <a href={team.figmaUrl} target="_blank" rel="noopener noreferrer">
                            <Figma className="h-4 w-4 mr-2" />
                            Figma
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      )}
                      {team.websiteUrl && (
                        <Button variant="outline" asChild>
                          <a href={team.websiteUrl} target="_blank" rel="noopener noreferrer">
                            <Globe className="h-4 w-4 mr-2" />
                            Website
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="projects" className="space-y-4">
              {team.projects && team.projects.length > 0 ? (
                team.projects.map((project) => (
                  <Card key={project.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{project.name}</h3>
                            <Badge className={PROJECT_STATUS_COLORS[project.status]} variant="secondary">
                              {project.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          {project.description && (
                            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Created {formatRelativeTime(project.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {project.githubUrl && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                                <Github className="h-3 w-3 mr-1" />
                                Code
                              </a>
                            </Button>
                          )}
                          {project.demoUrl && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Demo
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No projects yet</h3>
                    <p className="text-sm text-muted-foreground">
                      {isLeader ? "Create your first project to get started!" : "The team hasn't started any projects yet."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardContent className="py-8 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Activity feed coming soon</h3>
                  <p className="text-sm text-muted-foreground">
                    Track team member activity, project updates, and milestones.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements">
              {team.achievements && team.achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {team.achievements.map((achievement) => (
                    <Card key={achievement.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">🏆</div>
                          <div>
                            <h3 className="font-semibold">{achievement.title}</h3>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                +{achievement.xpReward} XP
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(achievement.earnedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No achievements yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete projects and reach milestones to earn team achievements!
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.map((member) => {
                // Use session user data if this is the current user, otherwise use member data
                const isCurrentUser = member.userId === user?.id
                const displayName = isCurrentUser ? user?.displayName : member.user?.display_name || member.user?.email
                const avatarUrl = isCurrentUser ? user?.avatarUrl : member.user?.avatar_url
                const email = isCurrentUser ? user?.email : member.user?.email
                
                return (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback>
                        {displayName?.charAt(0) || email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {displayName || "Unknown User"}
                        </p>
                      {member.role === 'leader' && (
                        <Star className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                      <p className="text-xs text-muted-foreground capitalize">
                        {member.role.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(member.joinedAt)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Team Info */}
          <Card>
            <CardHeader>
              <CardTitle>Team Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {team.timeline && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Timeline</p>
                  <p className="text-sm">{team.timeline}</p>
                </div>
              )}
              
              {team.budgetRange && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Budget Range</p>
                  <p className="text-sm">{team.budgetRange}</p>
                </div>
              )}
              
              {team.meetingSchedule && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Meeting Schedule</p>
                  <p className="text-sm">{team.meetingSchedule}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Founded</p>
                <p className="text-sm">{formatDate(team.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {team.tags && team.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {team.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

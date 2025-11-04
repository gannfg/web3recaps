"use client"

import { useEffect, useState, useMemo, useCallback, memo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { ProjectCreateForm } from "@/components/projects/project-create-form"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Settings, Users, UserPlus, Mail, Crown, Shield, User, Trash2, MoreHorizontal, FolderOpen, Plus, ExternalLink, Eye, Save, Upload, Globe, Lock, AlertTriangle, Calendar, MapPin, DollarSign, Clock, Github, Figma, Link as LinkIcon, ShieldCheck, UserX, Edit3, Camera, X } from "lucide-react"
import type { Team, TeamMember, TeamInvitation, Project, User as UserType } from "@/lib/types"
import Link from "next/link"

const MEMBER_ROLES = [
  { value: "member", label: "Member", icon: User },
  { value: "developer", label: "Developer", icon: User },
  { value: "designer", label: "Designer", icon: User },
  { value: "pm", label: "Project Manager", icon: Shield },
  { value: "marketing", label: "Marketing", icon: User },
  { value: "co_leader", label: "Co-Leader", icon: Crown },
]

const ROLE_COLORS = {
  leader: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  co_leader: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  pm: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  developer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  designer: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  marketing: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  member: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
}

// Memoized member row to reduce re-renders
const MemberRow = memo(function MemberRow({
  member,
  user,
  onChangeRole,
  onRemove,
}: {
  member: TeamMember
  user: UserType | null
  onChangeRole: (memberId: string, newRole: TeamMember['role']) => void
  onRemove: (memberId: string) => void
}) {
  const isCurrentUser = member.userId === user?.id
  const displayName = isCurrentUser ? user?.displayName : member.user?.display_name || member.user?.email
  const avatarUrl = isCurrentUser ? user?.avatarUrl : member.user?.avatar_url
  const email = isCurrentUser ? user?.email : member.user?.email

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatarUrl} className="object-cover" />
          <AvatarFallback>{displayName?.charAt(0) || email?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{displayName || "Unknown User"}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={ROLE_COLORS[member.role]} variant="secondary">
              {member.role.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </div>

      {member.role !== 'leader' && (
        <div className="flex items-center gap-2">
          <Select
            value={member.role}
            onValueChange={(value) => onChangeRole(member.id, value as TeamMember['role'])}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMBER_ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Member</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove {member.user?.display_name || "this member"} from the team? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onRemove(member.id)}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
})

export default function TeamManagePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useSession()
  const { execute } = useApi()
  const { toast } = useToast()

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>("member")
  const [inviteMessage, setInviteMessage] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  
  // User search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserType[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  
  // Settings form state
  const [isEditingSettings, setIsEditingSettings] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    description: "",
    avatarUrl: "",
    maxMembers: 5,
    status: "recruiting" as const,
    projectType: "hackathon" as const,
    timeline: "",
    location: "remote" as const,
    budgetRange: "unpaid" as const,
    meetingSchedule: "",
    githubUrl: "",
    figmaUrl: "",
    websiteUrl: "",
    discordUrl: "",
    skills: [] as string[],
    skillsRequired: [] as string[],
    tags: [] as string[]
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>("")

  const teamId = params.id as string
  
  
  const isLeader = useMemo(() => {
    if (!team || !user) return false
    return (
      team.createdBy === user.id ||
      members.some(m => m.userId === user.id && (m.role === 'leader' || m.role === 'co_leader'))
    )
  }, [team, user, members])

  useEffect(() => {
    if (!teamId || !user) return
    loadTeamData()
  }, [teamId, user])

  const loadTeamData = async () => {
    setIsLoading(true)
    try {
      // Load all required resources in parallel
      const [teamResult, invitationsResult, projectsResult] = await Promise.all([
        execute(`/api/teams/${teamId}`, { headers: { "x-user-id": user!.id } }),
        execute(`/api/teams/${teamId}/invitations`, { headers: { "x-user-id": user!.id } }),
        execute(`/api/teams/${teamId}/projects`, { headers: { "x-user-id": user!.id } }),
      ])

      if (teamResult.success && teamResult.data) {
        setTeam(teamResult.data)
        setMembers(teamResult.data.members || [])
        setSettingsForm({
          name: teamResult.data.name || "",
          description: teamResult.data.description || "",
          avatarUrl: teamResult.data.avatarUrl || "",
          maxMembers: teamResult.data.maxMembers || 5,
          status: teamResult.data.status || "recruiting",
          projectType: teamResult.data.projectType || "hackathon",
          timeline: teamResult.data.timeline || "",
          location: teamResult.data.location || "remote",
          budgetRange: teamResult.data.budgetRange || "unpaid",
          meetingSchedule: teamResult.data.meetingSchedule || "",
          githubUrl: teamResult.data.githubUrl || "",
          figmaUrl: teamResult.data.figmaUrl || "",
          websiteUrl: teamResult.data.websiteUrl || "",
          discordUrl: teamResult.data.discordUrl || "",
          skills: teamResult.data.skills || [],
          skillsRequired: teamResult.data.skillsRequired || [],
          tags: teamResult.data.tags || []
        })
      }

      if (invitationsResult.success && invitationsResult.data) {
        setInvitations(invitationsResult.data)
      }

      if (projectsResult.success && projectsResult.data) {
        setProjects(projectsResult.data)
      } else if (!projectsResult.success) {
        console.error("Failed to load projects:", projectsResult.error)
      }
    } catch (error) {
      console.error("Failed to load team data:", error)
      toast({
        title: "Error",
        description: "Failed to load team data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const result = await execute(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`)
      if (result.success) {
        setSearchResults(result.data || [])
      }
    } catch (error) {
      console.error("Failed to search users:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleUserSelect = (user: UserType) => {
    setSelectedUser(user)
    setSearchQuery(user.displayName || "")
    setSearchResults([])
  }

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !team || !selectedUser) return

    setIsInviting(true)
    try {
      const result = await execute(`/api/teams/${teamId}/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          inviteeId: selectedUser.id,
          role: inviteRole,
          message: inviteMessage.trim(),
        }),
      })

      if (result.success) {
        const inviteTarget = selectedUser.displayName || "User"
        
        toast({
          title: "Invitation Sent!",
          description: `Invited ${inviteTarget} to join the team as ${inviteRole}`,
        })
        
        // Reset form
        setInviteMessage("")
        setInviteRole("member")
        setSearchQuery("")
        setSelectedUser(null)
        setSearchResults([])
        
        loadTeamData() // Refresh invitations
      }
    } catch (error) {
      console.error("Failed to send invitation:", error)
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
    }
  }

  const handleUpdateMemberRole = async (memberId: string, newRole: TeamMember['role']) => {
    if (!user || !team) return

    try {
      const result = await execute(`/api/teams/${teamId}/members/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (result.success) {
        toast({
          title: "Role Updated",
          description: "Member role updated successfully",
        })
        loadTeamData() // Refresh members
      }
    } catch (error) {
      console.error("Failed to update member role:", error)
      toast({
        title: "Error",
        description: "Failed to update member role",
        variant: "destructive",
      })
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!user || !team) return

    try {
      const result = await execute(`/api/teams/${teamId}/members/${memberId}`, {
        method: "DELETE",
        headers: { "x-user-id": user.id },
      })

      if (result.success) {
        toast({
          title: "Member Removed",
          description: "Member removed from team successfully",
        })
        loadTeamData() // Refresh members
      }
    } catch (error) {
      console.error("Failed to remove member:", error)
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      })
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!user) return

    try {
      const result = await execute(`/api/teams/${teamId}/invitations/${invitationId}`, {
        method: "DELETE",
        headers: { "x-user-id": user.id },
      })

      if (result.success) {
        toast({
          title: "Invitation Cancelled",
          description: "Invitation cancelled successfully",
        })
        loadTeamData() // Refresh invitations
      }
    } catch (error) {
      console.error("Failed to cancel invitation:", error)
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive",
      })
    }
  }

  const handleProjectCreated = (newProject: Project) => {
    setProjects([newProject, ...projects])
    setShowCreateProject(false)
    toast({
      title: "Project Created!",
      description: `${newProject.name} has been created successfully`
    })
  }

  const handleSettingsUpdate = async () => {
    if (!user || !team) return

    setIsSavingSettings(true)
    try {
      // Upload avatar if file is selected
      let avatarUrl = settingsForm.avatarUrl
      if (avatarFile) {
        try {
          const { resizeImage } = await import("@/lib/image-utils")
          const resizedFile = await resizeImage(avatarFile, {
            maxWidth: 512,
            maxHeight: 512,
            quality: 0.9,
            maxSizeBytes: 2 * 1024 * 1024, // 2MB for team avatars
          })

          const uploadFormData = new FormData()
          uploadFormData.append('file', resizedFile)
          uploadFormData.append('bucket', 'team-avatars')
          uploadFormData.append('entityId', team.id)
          uploadFormData.append('entityType', 'team')

          const uploadResult = await execute('/api/upload', {
            method: 'POST',
            body: uploadFormData,
          })

          console.log("Upload result:", uploadResult)

          if (uploadResult.success && uploadResult.data) {
            avatarUrl = uploadResult.data.publicUrl
            console.log("New avatar URL:", avatarUrl)
            console.log("Updating settingsForm with new avatarUrl:", avatarUrl)
            // Update the form state with the new avatar URL
            setSettingsForm(prev => {
              const updated = { ...prev, avatarUrl }
              console.log("SettingsForm updated:", updated)
              return updated
            })
            // Clear the preview so it uses the Supabase URL
            setAvatarPreview("")
            setAvatarFile(null)
          } else {
            console.error("Upload failed:", uploadResult)
          }
        } catch (error) {
          console.error('Error uploading avatar:', error)
          toast({
            title: "Warning",
            description: "Failed to upload avatar, but other settings were saved",
            variant: "destructive",
          })
        }
      }

      const result = await execute(`/api/teams/${teamId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          ...settingsForm,
          avatarUrl
        }),
      })

      if (result.success) {
        toast({
          title: "Settings Updated",
          description: "Team settings have been updated successfully",
        })
        setIsEditingSettings(false)
        setAvatarFile(null)
        setAvatarPreview("")
        // Don't call loadTeamData() here as it overwrites our updated form state
        // The form state already has the correct data
      } else {
        throw new Error(result.error || "Failed to update settings")
      }
    } catch (error) {
      console.error("Error updating settings:", error)
      toast({
        title: "Error",
        description: "Failed to update team settings",
        variant: "destructive",
      })
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleAvatarUpload = (file: File) => {
    setAvatarFile(file)
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview("")
  }

  const addSkill = (skill: string) => {
    if (skill.trim() && !settingsForm.skills.includes(skill.trim())) {
      setSettingsForm(prev => ({
        ...prev,
        skills: [...prev.skills, skill.trim()]
      }))
    }
  }

  const removeSkill = (skill: string) => {
    setSettingsForm(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }))
  }

  const addRequiredSkill = (skill: string) => {
    if (skill.trim() && !settingsForm.skillsRequired.includes(skill.trim())) {
      setSettingsForm(prev => ({
        ...prev,
        skillsRequired: [...prev.skillsRequired, skill.trim()]
      }))
    }
  }

  const removeRequiredSkill = (skill: string) => {
    setSettingsForm(prev => ({
      ...prev,
      skillsRequired: prev.skillsRequired.filter(s => s !== skill)
    }))
  }

  const addTag = (tag: string) => {
    if (tag.trim() && !settingsForm.tags.includes(tag.trim())) {
      setSettingsForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }))
    }
  }

  const removeTag = (tag: string) => {
    setSettingsForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-48 mx-auto mb-4" />
              <div className="h-4 bg-muted rounded w-32 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Team Not Found</h1>
          <p className="text-muted-foreground mb-6">The team you're looking for doesn't exist or you don't have access to it.</p>
          <Button asChild>
            <Link href="/teams">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Teams
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!isLeader) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don't have permission to manage this team.</p>
          <Button asChild>
            <Link href={`/teams/${teamId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Team
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/teams/${teamId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Team
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Settings className="h-8 w-8" />
              Manage {team.name}
            </h1>
            <p className="text-muted-foreground">Team management and member administration</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Projects ({projects.length})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Invitations ({invitations.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members ({members.length}/{team.maxMembers})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => {
                  // Use session user data if this is the current user, otherwise use member data
                  const isCurrentUser = member.userId === user?.id
                  const displayName = isCurrentUser ? user?.displayName : member.user?.display_name || member.user?.email
                  const avatarUrl = isCurrentUser ? user?.avatarUrl : member.user?.avatar_url
                  const email = isCurrentUser ? user?.email : member.user?.email
                  
                  return (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={avatarUrl} className="object-cover" />
                          <AvatarFallback>{displayName?.charAt(0) || email?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{displayName || "Unknown User"}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={ROLE_COLORS[member.role]} variant="secondary">
                              {member.role.replace('_', ' ')}
                            </Badge>
                          </div>
                      </div>
                    </div>
                    
                    {member.role !== 'leader' && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleUpdateMemberRole(member.id, value as TeamMember['role'])}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEMBER_ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {member.user?.display_name || "this member"} from the team? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveMember(member.id)}>
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Team Projects</h3>
              <p className="text-sm text-muted-foreground">Manage and showcase your team's projects</p>
            </div>
            <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                {team && (
                  <ProjectCreateForm 
                    team={team} 
                    onProjectCreated={handleProjectCreated}
                    onCancel={() => setShowCreateProject(false)}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first project to start showcasing your team's work!
                </p>
                <Button onClick={() => setShowCreateProject(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{project.name}</h3>
                          <Badge variant="outline" className="capitalize">
                            {project.status.replace('_', ' ')}
                          </Badge>
                          {project.projectType && (
                            <Badge variant="secondary" className="capitalize">
                              {project.projectType.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        
                        {project.tagline && (
                          <p className="text-sm text-muted-foreground mb-2">{project.tagline}</p>
                        )}
                        
                        {project.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {project.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {project.viewsCount} views
                          </div>
                          {project.contributors && project.contributors.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {project.contributors.length} contributors
                            </div>
                          )}
                          {project.progress > 0 && (
                            <div className="flex items-center gap-1">
                              <span>{project.progress}% complete</span>
                            </div>
                          )}
                        </div>

                        {project.techStack && project.techStack.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {project.techStack.slice(0, 3).map((tech) => (
                              <Badge key={tech} variant="outline" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                            {project.techStack.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{project.techStack.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/projects/${project.id}`}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </Button>
                        {project.demoUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={project.demoUrl} target="_blank">
                              <Eye className="h-4 w-4 mr-2" />
                              Demo
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-6">
          {/* Send New Invitation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite New Member
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInviteMember} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* User Search Input */}
                  <div className="space-y-2">
                    <Label htmlFor="searchQuery">Search Users *</Label>
                    <div className="relative">
                      <Input
                        id="searchQuery"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          searchUsers(e.target.value)
                        }}
                        placeholder="Search by name, email, or wallet..."
                        required
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer"
                            onClick={() => handleUserSelect(user)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatarUrl} />
                              <AvatarFallback>
                                {user.displayName?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {user.displayName || "No name"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Selected User Display */}
                    {selectedUser && (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={selectedUser.avatarUrl} />
                          <AvatarFallback>
                            {selectedUser.displayName?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {selectedUser.displayName || "No name"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(null)
                            setSearchQuery("")
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inviteRole">Role</Label>
                    <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as TeamMember['role'])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEMBER_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="inviteMessage">Personal Message (Optional)</Label>
                  <Textarea
                    id="inviteMessage"
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Add a personal message to your invitation..."
                    rows={3}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={isInviting || !selectedUser}
                >
                  {isInviting ? "Sending..." : "Send Invitation"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No pending invitations</p>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{invitation.invitee_email || "Unknown"}</h3>
                        <p className="text-sm text-muted-foreground">
                          Invited as {invitation.role.replace('_', ' ')} • {new Date(invitation.created_at).toLocaleDateString()}
                        </p>
                        {invitation.message && (
                          <p className="text-sm mt-1 italic">"{invitation.message}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {invitation.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <div className="flex gap-2">
                  {!isEditingSettings ? (
                    <Button onClick={() => setIsEditingSettings(true)} variant="outline">
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => setIsEditingSettings(false)} variant="outline">
                        Cancel
                      </Button>
                      <Button onClick={handleSettingsUpdate} disabled={isSavingSettings}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSavingSettings ? "Saving..." : "Save Changes"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Team Avatar */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <Avatar className={`h-20 w-20 ${isEditingSettings ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}>
                    <AvatarImage 
                      src={avatarPreview || settingsForm.avatarUrl || undefined} 
                      className="object-cover" 
                      onError={(e) => {
                        console.log("Avatar image failed to load:", {
                          src: avatarPreview || settingsForm.avatarUrl,
                          error: e,
                          hasAvatarUrl: !!settingsForm.avatarUrl,
                          hasPreview: !!avatarPreview,
                          settingsFormAvatarUrl: settingsForm.avatarUrl
                        })
                      }}
                      onLoad={() => {
                        console.log("Avatar image loaded successfully:", {
                          src: avatarPreview || settingsForm.avatarUrl,
                          hasAvatarUrl: !!settingsForm.avatarUrl,
                          hasPreview: !!avatarPreview
                        })
                      }}
                    />
                    <AvatarFallback className="text-lg bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                      {settingsForm.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isEditingSettings && (
                    <label 
                      htmlFor="avatar-upload" 
                      className="absolute inset-0 cursor-pointer rounded-full"
                      title="Click to change avatar"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{settingsForm.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {settingsForm.description || "No description provided"}
                  </p>
                  {isEditingSettings && avatarFile && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-green-600">New avatar selected</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatar}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team Name *</Label>
                  <Input
                    id="team-name"
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditingSettings}
                    placeholder="Enter team name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-members">Max Members</Label>
                  <Input
                    id="max-members"
                    type="number"
                    min="2"
                    max="50"
                    value={settingsForm.maxMembers}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, maxMembers: parseInt(e.target.value) || 5 }))}
                    disabled={!isEditingSettings}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team-status">Status</Label>
                  <Select
                    value={settingsForm.status}
                    onValueChange={(value) => setSettingsForm(prev => ({ ...prev, status: value as any }))}
                    disabled={!isEditingSettings}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recruiting">Recruiting</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-type">Project Type</Label>
                  <Select
                    value={settingsForm.projectType}
                    onValueChange={(value) => setSettingsForm(prev => ({ ...prev, projectType: value as any }))}
                    disabled={!isEditingSettings}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hackathon">Hackathon</SelectItem>
                      <SelectItem value="startup">Startup</SelectItem>
                      <SelectItem value="open_source">Open Source</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Select
                    value={settingsForm.location}
                    onValueChange={(value) => setSettingsForm(prev => ({ ...prev, location: value as any }))}
                    disabled={!isEditingSettings}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget-range">Budget Range</Label>
                  <Select
                    value={settingsForm.budgetRange}
                    onValueChange={(value) => setSettingsForm(prev => ({ ...prev, budgetRange: value as any }))}
                    disabled={!isEditingSettings}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="stipend">Stipend</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, description: e.target.value }))}
                  disabled={!isEditingSettings}
                  placeholder="Describe your team, goals, and what you're looking for..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="timeline">Timeline</Label>
                  <Input
                    id="timeline"
                    value={settingsForm.timeline}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, timeline: e.target.value }))}
                    disabled={!isEditingSettings}
                    placeholder="e.g., 3 months, 6 weeks"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meeting-schedule">Meeting Schedule</Label>
                  <Input
                    id="meeting-schedule"
                    value={settingsForm.meetingSchedule}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, meetingSchedule: e.target.value }))}
                    disabled={!isEditingSettings}
                    placeholder="e.g., Weekly on Tuesdays 7 PM EST"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills & Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Skills & Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Team Skills</Label>
                    <p className="text-sm text-muted-foreground mb-2">Skills your team currently has</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {settingsForm.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    {isEditingSettings && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add skill..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addSkill(e.currentTarget.value)
                              e.currentTarget.value = ''
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement
                            addSkill(input.value)
                            input.value = ''
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Required Skills</Label>
                    <p className="text-sm text-muted-foreground mb-2">Skills you're looking for in new members</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {settingsForm.skillsRequired.map((skill) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    {isEditingSettings && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add required skill..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addRequiredSkill(e.currentTarget.value)
                              e.currentTarget.value = ''
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement
                            addRequiredSkill(input.value)
                            input.value = ''
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <p className="text-sm text-muted-foreground mb-2">Tags to help others find your team</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {settingsForm.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      #{tag}
                    </Badge>
                  ))}
                </div>
                {isEditingSettings && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag(e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement
                        addTag(input.value)
                        input.value = ''
                      }}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Links & Resources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Links & Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="github-url">GitHub Repository</Label>
                  <div className="flex gap-2">
                    <Github className="h-4 w-4 mt-3 text-muted-foreground" />
                    <Input
                      id="github-url"
                      value={settingsForm.githubUrl}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, githubUrl: e.target.value }))}
                      disabled={!isEditingSettings}
                      placeholder="https://github.com/username/repo"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="figma-url">Figma Design</Label>
                  <div className="flex gap-2">
                    <Figma className="h-4 w-4 mt-3 text-muted-foreground" />
                    <Input
                      id="figma-url"
                      value={settingsForm.figmaUrl}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, figmaUrl: e.target.value }))}
                      disabled={!isEditingSettings}
                      placeholder="https://figma.com/file/..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website-url">Website</Label>
                  <div className="flex gap-2">
                    <Globe className="h-4 w-4 mt-3 text-muted-foreground" />
                    <Input
                      id="website-url"
                      value={settingsForm.websiteUrl}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, websiteUrl: e.target.value }))}
                      disabled={!isEditingSettings}
                      placeholder="https://your-website.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discord-url">Discord Server</Label>
                  <div className="flex gap-2">
                    <Users className="h-4 w-4 mt-3 text-muted-foreground" />
                    <Input
                      id="discord-url"
                      value={settingsForm.discordUrl}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, discordUrl: e.target.value }))}
                      disabled={!isEditingSettings}
                      placeholder="https://discord.gg/..."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                  <h4 className="font-semibold text-destructive mb-2">Delete Team</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete this team and all associated data. This action cannot be undone.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <UserX className="h-4 w-4 mr-2" />
                        Delete Team
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Team</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{team.name}"? This action cannot be undone. 
                          All team data, members, projects, and invitations will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => {
                            // Navigate to teams page after deletion
                            router.push('/teams')
                          }}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete Team
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

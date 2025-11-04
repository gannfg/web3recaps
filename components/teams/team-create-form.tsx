"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSession } from "@/store/useSession"
import { useApi } from "@/hooks/use-api"
import { X, Plus, Upload, Camera, Github, Figma, Globe, MessageCircle } from "lucide-react"
import type { Team } from "@/lib/types"

interface TeamCreateFormProps {
  onTeamCreated?: (team: Team) => void
  onCancel?: () => void
}

const COMMON_SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Solana",
  "Rust",
  "Python",
  "Node.js",
  "UI/UX Design",
  "Figma",
  "Product Management",
  "Marketing",
  "Business Development",
  "Smart Contracts",
  "DeFi",
  "NFTs",
  "Web3",
  "Blockchain",
  "DevOps",
  "Testing",
  "Mobile Development",
  "Data Science",
  "Machine Learning",
  "Game Development",
  "3D Modeling",
  "Animation",
  "Video Editing",
  "Content Creation",
  "Community Management",
  "Sales",
  "Legal",
  "Finance",
  "Accounting",
]

const PROJECT_TYPES = [
  { value: "hackathon", label: "Hackathon Project" },
  { value: "startup", label: "Startup" },
  { value: "learning", label: "Learning Project" },
  { value: "freelance", label: "Freelance Work" },
  { value: "open_source", label: "Open Source" },
]

const LOCATION_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
]

const BUDGET_RANGES = [
  { value: "unpaid", label: "Unpaid / Learning" },
  { value: "equity", label: "Equity Only" },
  { value: "0-1k", label: "$0 - $1,000" },
  { value: "1k-5k", label: "$1,000 - $5,000" },
  { value: "5k-10k", label: "$5,000 - $10,000" },
  { value: "10k+", label: "$10,000+" },
  { value: "tbd", label: "To Be Discussed" },
]

export function TeamCreateForm({ onTeamCreated, onCancel }: TeamCreateFormProps) {
  const { user } = useSession()
  const { execute } = useApi()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    avatarUrl: "",
    maxMembers: 5,
    projectType: "hackathon" as const,
    timeline: "",
    location: "remote" as const,
    budgetRange: "unpaid",
    meetingSchedule: "",
    githubUrl: "",
    figmaUrl: "",
    websiteUrl: "",
    discordUrl: "",
  })
  
  const [skillsRequired, setSkillsRequired] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [newSkillRequired, setNewSkillRequired] = useState("")
  const [newSkill, setNewSkill] = useState("")
  const [newTag, setNewTag] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)

    const teamData = {
      ...formData,
      skills,
      skillsRequired,
      tags,
      leaderId: user.id,
      status: "recruiting" as const,
    }

    const result = await execute("/api/teams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user.id,
      },
      body: JSON.stringify(teamData),
    })

    if (result.success && result.data) {
      const team = result.data as Team
      
      // Upload avatar if file was selected
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

          if (uploadResult.success && uploadResult.data) {
            // Update team with the uploaded avatar URL using the team creation API
            await execute(`/api/teams/${team.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "x-user-id": user.id,
              },
              body: JSON.stringify({ avatar_url: uploadResult.data.publicUrl }),
            })
          }
        } catch (error) {
          console.error('Error uploading avatar:', error)
        }
      }
      
      onTeamCreated?.(team)
      // Reset form
      setFormData({
        name: "",
        description: "",
        avatarUrl: "",
        maxMembers: 5,
        projectType: "hackathon",
        timeline: "",
        location: "remote",
        budgetRange: "unpaid",
        meetingSchedule: "",
        githubUrl: "",
        figmaUrl: "",
        websiteUrl: "",
        discordUrl: "",
      })
      setSkillsRequired([])
      setSkills([])
      setTags([])
      setAvatarFile(null)
    }

    setIsSubmitting(false)
  }

  const handleFileUpload = async (file: File) => {
    // Store the file for upload after team creation
    setAvatarFile(file)
    
    // Create a preview URL for immediate display
    const previewUrl = URL.createObjectURL(file)
    setFormData({ ...formData, avatarUrl: previewUrl })
  }

  const addSkillRequired = (skill: string) => {
    if (skill && !skillsRequired.includes(skill)) {
      setSkillsRequired([...skillsRequired, skill])
      setNewSkillRequired("")
    }
  }

  const removeSkillRequired = (skillToRemove: string) => {
    setSkillsRequired(skillsRequired.filter((skill) => skill !== skillToRemove))
  }

  const addSkill = (skill: string) => {
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill])
      setNewSkill("")
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove))
  }

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Team
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Team Avatar */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Team Avatar</h3>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={formData.avatarUrl} className="object-cover" />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                  {formData.name?.charAt(0) || "T"}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                variant="outline"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="h-4 w-4 mr-2" />
                Upload Avatar
              </Button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
              />
            </div>
          </div>

          <Separator />

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter team name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectType">Project Type *</Label>
                <Select
                  value={formData.projectType}
                  onValueChange={(value) => setFormData({ ...formData, projectType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your team's goals, project vision, and what you're building..."
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxMembers">Max Members</Label>
                <Select
                  value={formData.maxMembers.toString()}
                  onValueChange={(value) => setFormData({ ...formData, maxMembers: Number.parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} members
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeline">Timeline</Label>
                <Input
                  id="timeline"
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  placeholder="e.g., 3 months, 6 weeks, ongoing"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Work Style</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => setFormData({ ...formData, location: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Skills & Requirements */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Skills & Requirements</h3>
            
            {/* Team Skills */}
            <div className="space-y-4">
              <Label>Our Team's Skills</Label>
              <p className="text-sm text-muted-foreground">Skills your team already has</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="default" className="flex items-center gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill your team has"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(newSkill))}
                />
                <Button type="button" variant="outline" onClick={() => addSkill(newSkill)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {COMMON_SKILLS.filter((skill) => !skills.includes(skill))
                  .slice(0, 8)
                  .map((skill) => (
                    <Button
                      key={skill}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSkill(skill)}
                      className="text-xs"
                    >
                      + {skill}
                    </Button>
                  ))}
              </div>
            </div>

            {/* Skills Required */}
            <div className="space-y-4">
              <Label>Skills We Need</Label>
              <p className="text-sm text-muted-foreground">Skills you're looking for in new team members</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {skillsRequired.map((skill) => (
                  <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkillRequired(skill)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSkillRequired}
                  onChange={(e) => setNewSkillRequired(e.target.value)}
                  placeholder="Add a skill you're looking for"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkillRequired(newSkillRequired))}
                />
                <Button type="button" variant="outline" onClick={() => addSkillRequired(newSkillRequired)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {COMMON_SKILLS.filter((skill) => !skillsRequired.includes(skill) && !skills.includes(skill))
                  .slice(0, 8)
                  .map((skill) => (
                    <Button
                      key={skill}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSkillRequired(skill)}
                      className="text-xs"
                    >
                      + {skill}
                    </Button>
                  ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Project Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Project Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetRange">Budget Range</Label>
                <Select
                  value={formData.budgetRange}
                  onValueChange={(value) => setFormData({ ...formData, budgetRange: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meetingSchedule">Meeting Schedule</Label>
                <Input
                  id="meetingSchedule"
                  value={formData.meetingSchedule}
                  onChange={(e) => setFormData({ ...formData, meetingSchedule: e.target.value })}
                  placeholder="e.g., Weekly on Fridays 2pm UTC"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-4">
              <Label>Tags</Label>
              <p className="text-sm text-muted-foreground">Add tags to help others discover your team</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="flex items-center gap-1">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag (e.g., defi, gaming, dao)"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag(newTag))}
                />
                <Button type="button" variant="outline" onClick={() => addTag(newTag)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Project Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Project Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="githubUrl" className="flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  GitHub Repository
                </Label>
                <Input
                  id="githubUrl"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  placeholder="https://github.com/username/repo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="figmaUrl" className="flex items-center gap-2">
                  <Figma className="h-4 w-4" />
                  Figma Design
                </Label>
                <Input
                  id="figmaUrl"
                  value={formData.figmaUrl}
                  onChange={(e) => setFormData({ ...formData, figmaUrl: e.target.value })}
                  placeholder="https://figma.com/file/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website/Demo
                </Label>
                <Input
                  id="websiteUrl"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  placeholder="https://yourproject.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discordUrl" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Discord Server
                </Label>
                <Input
                  id="discordUrl"
                  value={formData.discordUrl}
                  onChange={(e) => setFormData({ ...formData, discordUrl: e.target.value })}
                  placeholder="https://discord.gg/..."
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.name || !formData.description}
              className="min-w-32"
            >
              {isSubmitting ? "Creating..." : "Create Team"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
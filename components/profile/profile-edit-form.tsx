"use client"

import type React from "react"

import { useState, useRef } from "react"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { X, Plus, Upload, Camera, MapPin, Globe, Github, Twitter, Linkedin, Mail, Loader2, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApi } from "@/hooks/use-api"

interface ProfileEditFormProps {
  user: User
  onSave: (updatedUser: Partial<User>) => Promise<void>
  onCancel: () => void
}

const AVAILABLE_SKILLS = [
  "Solana", "Rust", "JavaScript", "TypeScript", "React", "Next.js", "Web3", "DeFi", "NFTs", 
  "Smart Contracts", "Anchor", "Python", "Node.js", "UI/UX Design", "Product Management", 
  "Marketing", "DevOps", "GraphQL", "PostgreSQL", "MongoDB", "Docker", "Kubernetes"
]

const BLOCKCHAIN_EXPERIENCE = [
  "Solana", "Ethereum", "Bitcoin", "Polygon", "Avalanche", "Binance Smart Chain", 
  "Cardano", "Polkadot", "Cosmos", "Near", "Aptos", "Sui"
]

const SOLANA_EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner - Just getting started" },
  { value: "intermediate", label: "Intermediate - Built some projects" },
  { value: "advanced", label: "Advanced - Experienced developer" },
  { value: "expert", label: "Expert - Core contributor level" }
]

// Roles are managed by admins only. Do not expose role picker in profile edit.

export function ProfileEditForm({ user, onSave, onCancel }: ProfileEditFormProps) {
  const { toast } = useToast()
  const { execute } = useApi()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    displayName: user.displayName || "",
    bio: user.bio || "",
    avatarUrl: user.avatarUrl || "",
    bannerUrl: user.bannerUrl || "",
    skills: user.skills || [],
    // role is managed by admins only; not editable here
    learningGoals: user.learningGoals || "",
    learningGoalsList: user.learningGoalsList || [],
    motivation: user.motivation || "",
    blockchainExperience: user.blockchainExperience || [],
    solanaExperience: user.solanaExperience || "beginner",
    chains: user.chains || [],
    socialLinks: user.socialLinks || { 
      twitter: "", 
      github: "", 
      linkedin: "", 
      website: "",
      discord: "",
      email: ""
    },
    goals: user.goals || "",
    builderBio: user.builderBio || "",
    builderLinks: user.builderLinks || {},
    newsletterSubscribed: user.newsletterSubscribed !== false,
  })
  
  const [newSkill, setNewSkill] = useState("")
  const [newLearningGoal, setNewLearningGoal] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      console.log("Submitting profile data:", formData)
      await onSave(formData)
      setSubmitStatus('success')
      toast({
        title: "Profile Updated! 🎉",
        description: "Your profile has been successfully saved.",
      })
    } catch (error) {
      console.error("Profile update error:", error)
      setSubmitStatus('error')
      toast({
        title: "Save Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUpload = async (file: File, type: 'avatar' | 'banner') => {
    try {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 5MB. Please compress or choose a smaller image.",
          variant: "destructive",
        })
        return
      }

      // Upload to Supabase Storage instead of base64
      // Use 'avatars' bucket for both avatar and banner (or create separate bucket for banners)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', type === 'avatar' ? 'avatars' : 'avatars') // Using avatars for both for now
      formData.append('entityId', user.id)
      formData.append('entityType', 'user')

      console.log('Uploading file:', { 
        fileName: file.name, 
        fileSize: file.size, 
        fileType: file.type,
        bucket: 'avatars',
        entityId: user.id,
        entityType: 'user'
      })

      const result = await execute('/api/upload', {
        method: 'POST',
        body: formData,
      })

      console.log('Upload result:', result)

      if (result.success && result.data?.publicUrl) {
        const imageUrl = result.data.publicUrl
        setFormData(prev => ({
          ...prev,
          [type === 'avatar' ? 'avatarUrl' : 'bannerUrl']: imageUrl
        }))
        
        // Automatically save to database after upload
        try {
          const updateResult = await execute('/api/users/me', {
            method: 'PATCH',
            body: JSON.stringify({
              [type === 'avatar' ? 'avatarUrl' : 'bannerUrl']: imageUrl
            }),
          })
          
          if (updateResult.success) {
            toast({
              title: "File uploaded",
              description: `${type === 'avatar' ? 'Avatar' : 'Banner'} image uploaded and saved successfully.`,
            })
            // Refresh user data if onSave callback is available
            if (onSave) {
              onSave({ ...formData, [type === 'avatar' ? 'avatarUrl' : 'bannerUrl']: imageUrl } as any)
            }
          } else {
            throw new Error(updateResult.error || 'Failed to save to database')
          }
        } catch (dbError) {
          console.error('Database save error:', dbError)
          toast({
            title: "Uploaded but not saved",
            description: "Image uploaded but failed to save to database. Please try saving again.",
            variant: "destructive",
          })
        }
      } else {
        const errorMessage = result.error || 'Upload failed'
        console.error('Upload failed:', errorMessage, result)
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('File upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image. Please try again.'
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, skill],
      }))
      setNewSkill("")
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }))
  }

  const addLearningGoal = (goal: string) => {
    if (goal && !formData.learningGoalsList.includes(goal)) {
      setFormData((prev) => ({
        ...prev,
        learningGoalsList: [...prev.learningGoalsList, goal],
      }))
      setNewLearningGoal("")
    }
  }

  const removeLearningGoal = (goalToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      learningGoalsList: prev.learningGoalsList.filter((goal) => goal !== goalToRemove),
    }))
  }


  const toggleBlockchainExperience = (blockchain: string) => {
    setFormData(prev => ({
      ...prev,
      blockchainExperience: prev.blockchainExperience.includes(blockchain)
        ? prev.blockchainExperience.filter(b => b !== blockchain)
        : [...prev.blockchainExperience, blockchain]
    }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Profile Images Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Profile Images</h3>
              
              {/* Banner Upload */}
              <div className="space-y-2">
                <Label>Banner Image</Label>
                <div className="relative h-32 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors">
                  {formData.bannerUrl && (
                    <img src={formData.bannerUrl} alt="Banner preview" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => bannerInputRef.current?.click()}
                      className="backdrop-blur-sm bg-background/80"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Upload Banner
                    </Button>
                  </div>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, 'banner')
                    }}
                  />
                </div>
              </div>

              {/* Avatar Upload */}
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={formData.avatarUrl} className="object-cover" />
                    <AvatarFallback className="text-2xl">
                      {formData.displayName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Change Avatar
                  </Button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, 'avatar')
                    }}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Your display name"
                    required
                  />
                </div>
                {/* Role selection removed: roles are admin-managed */}
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
            </div>

            <Separator />

            {/* Skills Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Skills & Experience</h3>
              
              <div>
                <Label>Technical Skills</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill..."
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(newSkill))}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addSkill(newSkill)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {AVAILABLE_SKILLS.filter((skill) => !formData.skills.includes(skill)).map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => addSkill(skill)}
                      className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded-md transition-colors"
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="solanaExperience">Solana Experience Level</Label>
                <Select value={formData.solanaExperience} onValueChange={(value) => setFormData(prev => ({ ...prev, solanaExperience: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your Solana experience" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOLANA_EXPERIENCE_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Blockchain Experience</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {BLOCKCHAIN_EXPERIENCE.map((blockchain) => (
                    <div key={blockchain} className="flex items-center space-x-2">
                      <Checkbox
                        id={blockchain}
                        checked={formData.blockchainExperience.includes(blockchain)}
                        onCheckedChange={() => toggleBlockchainExperience(blockchain)}
                      />
                      <Label htmlFor={blockchain} className="text-sm">{blockchain}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Learning & Goals */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Learning & Goals</h3>
              
              <div>
                <Label htmlFor="motivation">What motivates you in Web3?</Label>
                <Textarea
                  id="motivation"
                  value={formData.motivation}
                  onChange={(e) => setFormData((prev) => ({ ...prev, motivation: e.target.value }))}
                  placeholder="Share what drives your passion for Web3 and Solana..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Learning Goals</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.learningGoalsList.map((goal) => (
                    <Badge key={goal} variant="outline" className="flex items-center gap-1">
                      {goal}
                      <button type="button" onClick={() => removeLearningGoal(goal)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newLearningGoal}
                    onChange={(e) => setNewLearningGoal(e.target.value)}
                    placeholder="Add a learning goal..."
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addLearningGoal(newLearningGoal))}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addLearningGoal(newLearningGoal)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="goals">Overall Goals</Label>
                <Textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) => setFormData((prev) => ({ ...prev, goals: e.target.value }))}
                  placeholder="What are your main goals in the Solana ecosystem?"
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Social Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="twitter" className="flex items-center gap-2">
                    <Twitter className="h-4 w-4" />
                    Twitter
                  </Label>
                  <Input
                    id="twitter"
                    value={formData.socialLinks.twitter}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, twitter: e.target.value },
                      }))
                    }
                    placeholder="https://twitter.com/username"
                  />
                </div>
                <div>
                  <Label htmlFor="github" className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    GitHub
                  </Label>
                  <Input
                    id="github"
                    value={formData.socialLinks.github}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, github: e.target.value },
                      }))
                    }
                    placeholder="https://github.com/username"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin" className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </Label>
                  <Input
                    id="linkedin"
                    value={formData.socialLinks.linkedin}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, linkedin: e.target.value },
                      }))
                    }
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div>
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    value={formData.socialLinks.website}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, website: e.target.value },
                      }))
                    }
                    placeholder="https://yourwebsite.com"
                  />
                </div>
                <div>
                  <Label htmlFor="discord">Discord</Label>
                  <Input
                    id="discord"
                    value={formData.socialLinks.discord}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, discord: e.target.value },
                      }))
                    }
                    placeholder="username#1234"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.socialLinks.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, email: e.target.value },
                      }))
                    }
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Preferences */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Preferences</h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="newsletter"
                  checked={formData.newsletterSubscribed}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, newsletterSubscribed: !!checked }))}
                />
                <Label htmlFor="newsletter">Subscribe to newsletter and updates</Label>
              </div>
            </div>

            <div className="flex gap-2 pt-6">
              <Button 
                type="submit" 
                size="lg" 
                disabled={isSubmitting}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : submitStatus === 'success' ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Saved!
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="lg" 
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
            
            {submitStatus === 'success' && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center text-green-800">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Profile updated successfully!</span>
                </div>
              </div>
            )}
            
            {submitStatus === 'error' && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center text-red-800">
                  <X className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Failed to save profile. Please try again.</span>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

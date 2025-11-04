"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, X, Upload, Globe, Github, FileText, MessageSquare, 
  Twitter, Calendar, Zap, Image as ImageIcon
} from "lucide-react"
import type { Project, Team } from "@/lib/types"

interface ProjectCreateFormProps {
  team: Team
  onProjectCreated?: (project: Project) => void
  onCancel?: () => void
}

const PROJECT_TYPES = [
  { value: 'web_app', label: '🌐 Web Application' },
  { value: 'mobile_app', label: '📱 Mobile App' },
  { value: 'game', label: '🎮 Game' },
  { value: 'defi', label: '🏦 DeFi Protocol' },
  { value: 'nft', label: '🎨 NFT Project' },
  { value: 'dao', label: '🏛️ DAO' },
  { value: 'tool', label: '🔧 Developer Tool' },
  { value: 'library', label: '📚 Library/SDK' },
  { value: 'other', label: '🔹 Other' }
]

const PROJECT_STATUS = [
  { value: 'planning', label: '📋 Planning' },
  { value: 'in_progress', label: '🚧 In Progress' },
  { value: 'completed', label: '✅ Completed' },
  { value: 'published', label: '🚀 Published' }
]

const POPULAR_CATEGORIES = [
  'DeFi', 'Gaming', 'Social', 'NFT', 'DAO', 'Infrastructure', 'Tools', 
  'Education', 'Analytics', 'Wallet', 'Exchange', 'Marketplace'
]

const POPULAR_TECH = [
  'React', 'Next.js', 'TypeScript', 'Node.js', 'Solana', 'Ethereum', 
  'Rust', 'Python', 'Go', 'React Native', 'Flutter', 'Unity'
]

const POPULAR_BLOCKCHAINS = [
  'Solana', 'Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 
  'Avalanche', 'BSC', 'Fantom'
]

export function ProjectCreateForm({ team, onProjectCreated, onCancel }: ProjectCreateFormProps) {
  const router = useRouter()
  const { execute } = useApi()
  const { toast } = useToast()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    longDescription: '',
    projectType: '',
    status: 'planning',
    progress: 0,
    category: [] as string[],
    tags: [] as string[],
    techStack: [] as string[],
    blockchain: [] as string[],
    
    // Media
    bannerImage: '',
    logoImage: '',
    screenshots: [] as string[],
    videos: [] as string[],
    
    // Links
    githubUrl: '',
    demoUrl: '',
    websiteUrl: '',
    docsUrl: '',
    figmaUrl: '',
    discordUrl: '',
    twitterUrl: '',
    
    // Dates
    startDate: '',
    endDate: '',
    launchDate: ''
  })
  
  // Input states for adding items
  const [newCategory, setNewCategory] = useState('')
  const [newTag, setNewTag] = useState('')
  const [newTech, setNewTech] = useState('')
  const [newBlockchain, setNewBlockchain] = useState('')
  const [newScreenshot, setNewScreenshot] = useState('')
  const [newVideo, setNewVideo] = useState('')

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addToArray = (field: string, value: string, setState: (value: string) => void) => {
    if (value.trim()) {
      const currentArray = formData[field as keyof typeof formData] as string[]
      if (!currentArray.includes(value.trim())) {
        updateFormData(field, [...currentArray, value.trim()])
      }
      setState('')
    }
  }

  const removeFromArray = (field: string, value: string) => {
    const currentArray = formData[field as keyof typeof formData] as string[]
    updateFormData(field, currentArray.filter(item => item !== value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Project name is required",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await execute(`/api/teams/${team.id}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          teamId: team.id
        })
      })

      if (result.success && result.data) {
        toast({
          title: "Project Created!",
          description: `${formData.name} has been created successfully`
        })
        
        if (onProjectCreated) {
          onProjectCreated(result.data)
        } else {
          router.push(`/projects/${result.data.id}`)
        }
      } else {
        throw new Error(result.error || 'Failed to create project')
      }
    } catch (error) {
      console.error('Project creation error:', error)
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Create New Project</h2>
          <p className="text-muted-foreground">for {team.name}</p>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="links">Links & Dates</TabsTrigger>
        </TabsList>

        {/* Basic Information */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Basics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="e.g. DeFi Dashboard"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={formData.tagline}
                    onChange={(e) => updateFormData('tagline', e.target.value)}
                    placeholder="Short catchy description"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Short Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Brief overview of your project"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="longDescription">Detailed Description</Label>
                <Textarea
                  id="longDescription"
                  value={formData.longDescription}
                  onChange={(e) => updateFormData('longDescription', e.target.value)}
                  placeholder="Comprehensive description for the showcase page"
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="projectType">Project Type</Label>
                  <Select value={formData.projectType} onValueChange={(value) => updateFormData('projectType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => updateFormData('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUS.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.status === 'in_progress' && (
                <div>
                  <Label htmlFor="progress">Progress ({formData.progress}%)</Label>
                  <Input
                    id="progress"
                    type="range"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => updateFormData('progress', parseInt(e.target.value))}
                    className="mt-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Details */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Categories & Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Categories */}
              <div>
                <Label>Categories</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Add category"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('category', newCategory, setNewCategory))}
                  />
                  <Button type="button" onClick={() => addToArray('category', newCategory, setNewCategory)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {POPULAR_CATEGORIES.map(cat => (
                    <Badge
                      key={cat}
                      variant={formData.category.includes(cat) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (formData.category.includes(cat)) {
                          removeFromArray('category', cat)
                        } else {
                          addToArray('category', cat, () => {})
                        }
                      }}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
                {formData.category.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.category.map(cat => (
                      <Badge key={cat} className="gap-1">
                        {cat}
                        <button
                          type="button"
                          onClick={() => removeFromArray('category', cat)}
                          className="hover:bg-muted-foreground/20 rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Tech Stack */}
              <div>
                <Label>Tech Stack</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newTech}
                    onChange={(e) => setNewTech(e.target.value)}
                    placeholder="Add technology"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('techStack', newTech, setNewTech))}
                  />
                  <Button type="button" onClick={() => addToArray('techStack', newTech, setNewTech)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {POPULAR_TECH.map(tech => (
                    <Badge
                      key={tech}
                      variant={formData.techStack.includes(tech) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (formData.techStack.includes(tech)) {
                          removeFromArray('techStack', tech)
                        } else {
                          addToArray('techStack', tech, () => {})
                        }
                      }}
                    >
                      {tech}
                    </Badge>
                  ))}
                </div>
                {formData.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.techStack.map(tech => (
                      <Badge key={tech} variant="secondary" className="gap-1">
                        {tech}
                        <button
                          type="button"
                          onClick={() => removeFromArray('techStack', tech)}
                          className="hover:bg-muted-foreground/20 rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Blockchain */}
              <div>
                <Label>Blockchain/Network</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newBlockchain}
                    onChange={(e) => setNewBlockchain(e.target.value)}
                    placeholder="Add blockchain"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('blockchain', newBlockchain, setNewBlockchain))}
                  />
                  <Button type="button" onClick={() => addToArray('blockchain', newBlockchain, setNewBlockchain)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {POPULAR_BLOCKCHAINS.map(chain => (
                    <Badge
                      key={chain}
                      variant={formData.blockchain.includes(chain) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (formData.blockchain.includes(chain)) {
                          removeFromArray('blockchain', chain)
                        } else {
                          addToArray('blockchain', chain, () => {})
                        }
                      }}
                    >
                      {chain}
                    </Badge>
                  ))}
                </div>
                {formData.blockchain.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.blockchain.map(chain => (
                      <Badge key={chain} variant="secondary" className="gap-1">
                        {chain}
                        <button
                          type="button"
                          onClick={() => removeFromArray('blockchain', chain)}
                          className="hover:bg-muted-foreground/20 rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media */}
        <TabsContent value="media" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Media</CardTitle>
              <p className="text-sm text-muted-foreground">
                Add images and videos to showcase your project
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bannerImage">Banner Image URL</Label>
                  <Input
                    id="bannerImage"
                    value={formData.bannerImage}
                    onChange={(e) => updateFormData('bannerImage', e.target.value)}
                    placeholder="https://example.com/banner.jpg"
                  />
                </div>

                <div>
                  <Label htmlFor="logoImage">Logo Image URL</Label>
                  <Input
                    id="logoImage"
                    value={formData.logoImage}
                    onChange={(e) => updateFormData('logoImage', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>

              <Separator />

              {/* Screenshots */}
              <div>
                <Label>Screenshots</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newScreenshot}
                    onChange={(e) => setNewScreenshot(e.target.value)}
                    placeholder="https://example.com/screenshot.jpg"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('screenshots', newScreenshot, setNewScreenshot))}
                  />
                  <Button type="button" onClick={() => addToArray('screenshots', newScreenshot, setNewScreenshot)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.screenshots.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {formData.screenshots.map((screenshot, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate flex-1">{screenshot}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromArray('screenshots', screenshot)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Videos */}
              <div>
                <Label>Videos (YouTube/Vimeo URLs)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newVideo}
                    onChange={(e) => setNewVideo(e.target.value)}
                    placeholder="https://youtube.com/embed/..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('videos', newVideo, setNewVideo))}
                  />
                  <Button type="button" onClick={() => addToArray('videos', newVideo, setNewVideo)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.videos.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {formData.videos.map((video, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate flex-1">{video}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromArray('videos', video)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Links & Dates */}
        <TabsContent value="links" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Links & Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="githubUrl">GitHub URL</Label>
                  <div className="relative">
                    <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="githubUrl"
                      value={formData.githubUrl}
                      onChange={(e) => updateFormData('githubUrl', e.target.value)}
                      placeholder="https://github.com/..."
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="demoUrl">Demo URL</Label>
                  <div className="relative">
                    <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="demoUrl"
                      value={formData.demoUrl}
                      onChange={(e) => updateFormData('demoUrl', e.target.value)}
                      placeholder="https://demo.example.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="websiteUrl"
                      value={formData.websiteUrl}
                      onChange={(e) => updateFormData('websiteUrl', e.target.value)}
                      placeholder="https://example.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="docsUrl">Documentation URL</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="docsUrl"
                      value={formData.docsUrl}
                      onChange={(e) => updateFormData('docsUrl', e.target.value)}
                      placeholder="https://docs.example.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="discordUrl">Discord URL</Label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="discordUrl"
                      value={formData.discordUrl}
                      onChange={(e) => updateFormData('discordUrl', e.target.value)}
                      placeholder="https://discord.gg/..."
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="twitterUrl">Twitter URL</Label>
                  <div className="relative">
                    <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="twitterUrl"
                      value={formData.twitterUrl}
                      onChange={(e) => updateFormData('twitterUrl', e.target.value)}
                      placeholder="https://twitter.com/..."
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => updateFormData('startDate', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => updateFormData('endDate', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="launchDate">Launch Date</Label>
                  <Input
                    id="launchDate"
                    type="date"
                    value={formData.launchDate}
                    onChange={(e) => updateFormData('launchDate', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  )
}

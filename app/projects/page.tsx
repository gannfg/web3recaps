"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useApi } from "@/hooks/use-api"
import { useSession } from "@/store/useSession"
import { 
  Search, Filter, Grid3X3, List, Star, TrendingUp, Clock, 
  Eye, Heart, Users, ExternalLink, Play, Github, Globe,
  Sparkles, Zap, Code, Gamepad2, Coins, Palette, Building2
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { formatRelativeTime } from "@/lib/utils"
import type { Project } from "@/lib/types"

interface ProjectFilters {
  search: string
  status: string
  projectType: string
  category: string
  techStack: string[]
  blockchain: string[]
  featured: boolean
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

const PROJECT_TYPES = [
  { value: 'all', label: 'All Types', icon: Code },
  { value: 'web_app', label: 'Web App', icon: Globe },
  { value: 'mobile_app', label: 'Mobile App', icon: Zap },
  { value: 'game', label: 'Game', icon: Gamepad2 },
  { value: 'defi', label: 'DeFi', icon: Coins },
  { value: 'nft', label: 'NFT', icon: Palette },
  { value: 'dao', label: 'DAO', icon: Building2 },
  { value: 'tool', label: 'Tool', icon: Code },
  { value: 'library', label: 'Library', icon: Code }
]

const PROJECT_STATUS = [
  { value: 'all', label: 'All Status' },
  { value: 'planning', label: '📋 Planning' },
  { value: 'in_progress', label: '🚧 In Progress' },
  { value: 'completed', label: '✅ Completed' },
  { value: 'published', label: '🚀 Published' }
]

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Recently Created' },
  { value: 'updated_at', label: 'Recently Updated' },
  { value: 'views_count', label: 'Most Viewed' },
  { value: 'likes_count', label: 'Most Liked' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'launch_date', label: 'Launch Date' }
]

const POPULAR_CATEGORIES = [
  'DeFi', 'Gaming', 'Social', 'NFT', 'DAO', 'Infrastructure', 
  'Tools', 'Education', 'Analytics', 'Marketplace'
]

const POPULAR_TECH = [
  'React', 'Next.js', 'TypeScript', 'Solana', 'Ethereum', 
  'Rust', 'Python', 'Unity', 'Flutter'
]

export default function ProjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { execute } = useApi()
  const { user } = useSession()
  
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    inProgress: 0,
    featured: 0,
    webApps: 0,
    defi: 0,
    games: 0
  })
  
  const [filters, setFilters] = useState<ProjectFilters>({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || 'all',
    projectType: searchParams.get('type') || 'all',
    category: searchParams.get('category') || 'all',
    techStack: searchParams.get('tech')?.split(',').filter(Boolean) || [],
    blockchain: searchParams.get('blockchain')?.split(',').filter(Boolean) || [],
    featured: searchParams.get('featured') === 'true',
    sortBy: searchParams.get('sortBy') || 'created_at',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  })

  useEffect(() => {
    loadProjects(true)
  }, [filters])

  const loadProjects = async (reset = false) => {
    setLoading(true)
    
    const offset = reset ? 0 : projects.length
    const params = new URLSearchParams({
      limit: '20',
      offset: offset.toString(),
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    })
    
    if (filters.search) params.append('search', filters.search)
    if (filters.status !== 'all') params.append('status', filters.status)
    if (filters.projectType !== 'all') params.append('projectType', filters.projectType)
    if (filters.category !== 'all') params.append('category', filters.category)
    if (filters.techStack.length > 0) params.append('techStack', filters.techStack.join(','))
    if (filters.blockchain.length > 0) params.append('blockchain', filters.blockchain.join(','))
    if (filters.featured) params.append('featured', 'true')

    try {
      const result = await execute(`/api/projects?${params.toString()}`)
      
      if (result.success && result.data) {
        const newProjects = result.data.projects
        setProjects(reset ? newProjects : [...projects, ...newProjects])
        setHasMore(result.data.hasMore)
        setStats(result.data.stats)
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateFilter = (key: keyof ProjectFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    
    // Update URL
    const params = new URLSearchParams(searchParams)
    if (value && value !== 'all' && value !== '' && (Array.isArray(value) ? value.length > 0 : true)) {
      params.set(key === 'projectType' ? 'type' : key, Array.isArray(value) ? value.join(',') : value.toString())
    } else {
      params.delete(key === 'projectType' ? 'type' : key)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const toggleTechStack = (tech: string) => {
    const newTechStack = filters.techStack.includes(tech)
      ? filters.techStack.filter(t => t !== tech)
      : [...filters.techStack, tech]
    updateFilter('techStack', newTechStack)
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      projectType: 'all',
      category: 'all',
      techStack: [],
      blockchain: [],
      featured: false,
      sortBy: 'created_at',
      sortOrder: 'desc'
    })
    router.push('/projects')
  }

  const ProjectCard = ({ project }: { project: Project }) => {
    const TypeIcon = PROJECT_TYPES.find(t => t.value === project.projectType)?.icon || Code
    
    return (
      <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
        <div className="relative">
          {/* Banner/Screenshot */}
          <div className="aspect-video relative bg-muted">
            {project.bannerImage || (project.screenshots && project.screenshots[0]) ? (
              <Image
                src={project.bannerImage || project.screenshots[0]}
                alt={project.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                <TypeIcon className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}
            
            {/* Featured badge */}
            {project.isFeatured && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-yellow-500 text-yellow-900">
                  <Star className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              </div>
            )}

            {/* Project logo overlay */}
            {project.logoImage && (
              <div className="absolute bottom-3 left-3">
                <div className="w-12 h-12 rounded-lg bg-white/90 backdrop-blur-sm p-1">
                  <Image
                    src={project.logoImage}
                    alt={`${project.name} logo`}
                    width={40}
                    height={40}
                    className="w-full h-full object-contain rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <Link href={`/projects/${project.id}`} className="block">
                  <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                </Link>
                {project.tagline && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {project.tagline}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-1 ml-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {project.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {project.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {project.description}
              </p>
            )}
          </div>

          {/* Team info */}
          {project.team && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-4 w-4">
                <AvatarImage src={project.team.avatarUrl} />
                <AvatarFallback className="text-[8px]">
                  {project.team.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{project.team.name}</span>
            </div>
          )}

          {/* Tech stack */}
          {project.techStack && project.techStack.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.techStack.slice(0, 3).map((tech) => (
                <Badge key={tech} variant="secondary" className="text-xs">
                  {tech}
                </Badge>
              ))}
              {project.techStack.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{project.techStack.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {project.viewsCount}
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {project.likesCount}
              </div>
              {project.contributors && project.contributors.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {project.contributors.length}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {project.demoUrl && (
                <Link href={project.demoUrl} target="_blank">
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Play className="h-3 w-3" />
                  </Button>
                </Link>
              )}
              {project.githubUrl && (
                <Link href={project.githubUrl} target="_blank">
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Github className="h-3 w-3" />
                  </Button>
                </Link>
              )}
              <Link href={`/projects/${project.id}`}>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Project Showcase
          </h1>
          <p className="text-muted-foreground">Discover amazing projects built by our community</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Projects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
            <div className="text-xs text-muted-foreground">Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.featured}</div>
            <div className="text-xs text-muted-foreground">Featured</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.webApps}</div>
            <div className="text-xs text-muted-foreground">Web Apps</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.defi}</div>
            <div className="text-xs text-muted-foreground">DeFi</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-pink-600">{stats.games}</div>
            <div className="text-xs text-muted-foreground">Games</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6 space-y-4">
          {/* Search and main filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.projectType} onValueChange={(value) => updateFilter('projectType', value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger className="w-full md:w-[160px]">
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

            <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tech stack filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Technology</label>
              {(filters.techStack.length > 0 || filters.featured) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={filters.featured ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => updateFilter('featured', !filters.featured)}
              >
                <Star className="h-3 w-3 mr-1" />
                Featured
              </Badge>
              {POPULAR_TECH.map(tech => (
                <Badge
                  key={tech}
                  variant={filters.techStack.includes(tech) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTechStack(tech)}
                >
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      <div className="space-y-6">
        {loading && projects.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-video bg-muted" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search terms
              </p>
              <Button onClick={clearFilters}>Clear filters</Button>
            </CardContent>
          </Card>
        ) : (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && projects.length > 0 && (
          <div className="text-center">
            <Button onClick={() => loadProjects(false)} variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Load More Projects
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

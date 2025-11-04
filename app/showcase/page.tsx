"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useApi } from "@/hooks/use-api"
import { useSession } from "@/store/useSession"
import { 
  Search, Star, Eye, Heart, Users, ExternalLink, Play, Github, 
  Sparkles, Code, Gamepad2, Coins, Palette, Building2, Crown,
  MapPin, Calendar, TrendingUp, Zap
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { formatRelativeTime } from "@/lib/utils"
import type { Project, Team } from "@/lib/types"

const PROJECT_TYPE_ICONS = {
  web_app: Code,
  mobile_app: Zap,
  game: Gamepad2,
  defi: Coins,
  nft: Palette,
  dao: Building2,
  tool: Code,
  library: Code,
  other: Code
}

export default function ShowcasePage() {
  const { execute } = useApi()
  const { user } = useSession()
  
  const [activeTab, setActiveTab] = useState('projects')
  const [projects, setProjects] = useState<Project[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [projectStats, setProjectStats] = useState({
    total: 0,
    featured: 0,
    published: 0
  })
  
  const [teamStats, setTeamStats] = useState({
    total: 0,
    recruiting: 0,
    active: 0
  })

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'projects') {
        const result = await execute('/api/projects?limit=12&sortBy=created_at&sortOrder=desc')
        if (result.success && result.data) {
          setProjects(result.data.projects)
          setProjectStats(result.data.stats)
        }
      } else {
        const result = await execute('/api/teams?limit=12&sortBy=created_at&sortOrder=desc')
        if (result.success && result.data) {
          setTeams(result.data.teams)
          setTeamStats(result.data.stats)
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.tagline?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const ProjectCard = ({ project }: { project: Project }) => {
    const TypeIcon = PROJECT_TYPE_ICONS[project.projectType || 'other']
    
    return (
      <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
        <div className="relative">
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
            
            {project.isFeatured && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-yellow-500 text-yellow-900">
                  <Star className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              </div>
            )}

            {project.logoImage && (
              <div className="absolute bottom-3 left-3">
                <div className="w-10 h-10 rounded-lg bg-white/90 backdrop-blur-sm p-1">
                  <Image
                    src={project.logoImage}
                    alt={`${project.name} logo`}
                    width={32}
                    height={32}
                    className="w-full h-full object-contain rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <Link href={`/projects/${project.id}`} className="block">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                </Link>
                {project.tagline && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {project.tagline}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="text-xs capitalize ml-2">
                {project.status.replace('_', ' ')}
              </Badge>
            </div>

            {project.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {project.description}
              </p>
            )}
          </div>

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

          {project.techStack && project.techStack.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.techStack.slice(0, 2).map((tech) => (
                <Badge key={tech} variant="secondary" className="text-xs">
                  {tech}
                </Badge>
              ))}
              {project.techStack.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{project.techStack.length - 2}
                </Badge>
              )}
            </div>
          )}

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
            </div>
            
            <div className="flex items-center gap-1">
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

  const TeamCard = ({ team }: { team: Team }) => {
    return (
      <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarImage src={team.avatarUrl} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                {team.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between">
                <Link href={`/teams/${team.id}`} className="block">
                  <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                    {team.name}
                  </h3>
                </Link>
                <Badge variant={team.status === 'recruiting' ? 'default' : 'secondary'} className="text-xs capitalize">
                  {team.status}
                </Badge>
              </div>
              
              {team.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {team.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {team.currentMemberCount || 0}/{team.maxMembers} members
                </div>
                {team.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {team.location}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatRelativeTime(team.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {team.skillsRequired && team.skillsRequired.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {team.skillsRequired.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {team.skillsRequired.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{team.skillsRequired.length - 3} more
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              {team.projectType && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {team.projectType.replace('_', ' ')}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Link href={`/teams/${team.id}`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  View Team
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Sparkles className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold">Community Showcase</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover amazing projects and talented teams building the future of Web3
        </p>
      </div>

      {/* Toggle Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Teams
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">{projectStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Projects</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600">{projectStats.featured}</div>
                <div className="text-sm text-muted-foreground">Featured</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{projectStats.published}</div>
                <div className="text-sm text-muted-foreground">Published</div>
              </CardContent>
            </Card>
          </div>

          {/* Projects Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-muted" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Code className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                <p className="text-muted-foreground">Try adjusting your search terms</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProjects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}

          {/* View All Projects */}
          <div className="text-center">
            <Link href="/projects">
              <Button variant="outline" size="lg">
                <TrendingUp className="h-4 w-4 mr-2" />
                View All Projects
              </Button>
            </Link>
          </div>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">{teamStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Teams</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{teamStats.recruiting}</div>
                <div className="text-sm text-muted-foreground">Recruiting</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{teamStats.active}</div>
                <div className="text-sm text-muted-foreground">Active</div>
              </CardContent>
            </Card>
          </div>

          {/* Teams Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-muted rounded-full" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTeams.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No teams found</h3>
                <p className="text-muted-foreground">Try adjusting your search terms</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeams.map(team => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          )}

          {/* View All Teams */}
          <div className="text-center">
            <Link href="/teams">
              <Button variant="outline" size="lg">
                <Users className="h-4 w-4 mr-2" />
                View All Teams
              </Button>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
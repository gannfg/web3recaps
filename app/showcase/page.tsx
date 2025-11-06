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
  MapPin, Calendar, TrendingUp, Zap, RefreshCw
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
      <Card className="group hover:shadow-lg transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Image Section */}
            <div className="relative w-full md:w-48 h-32 md:h-auto flex-shrink-0">
              <div className="relative w-full h-full rounded-lg overflow-hidden bg-muted">
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
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-yellow-500 text-yellow-900">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Link href={`/projects/${project.id}`}>
                    <h3 className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                  </Link>
                  {project.tagline && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {project.tagline}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                  {project.status.replace('_', ' ')}
                </Badge>
              </div>

              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {project.team && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={project.team.avatarUrl} />
                      <AvatarFallback className="text-[8px]">
                        {project.team.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{project.team.name}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {project.viewsCount}
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {project.likesCount}
                </div>
              </div>

              {project.techStack && project.techStack.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {project.techStack.slice(0, 4).map((tech) => (
                    <Badge key={tech} variant="secondary" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                  {project.techStack.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{project.techStack.length - 4}
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                {project.demoUrl && (
                  <Link href={project.demoUrl} target="_blank">
                    <Button variant="ghost" size="sm" className="h-8">
                      <Play className="h-3 w-3 mr-1" />
                      Demo
                    </Button>
                  </Link>
                )}
                {project.githubUrl && (
                  <Link href={project.githubUrl} target="_blank">
                    <Button variant="ghost" size="sm" className="h-8">
                      <Github className="h-3 w-3 mr-1" />
                      Code
                    </Button>
                  </Link>
                )}
                <Link href={`/projects/${project.id}`}>
                  <Button variant="outline" size="sm" className="h-8">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const TeamCard = ({ team }: { team: Team }) => {
    return (
      <Card className="group hover:shadow-lg transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 flex-shrink-0">
              <AvatarImage src={team.avatarUrl} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                {team.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Link href={`/teams/${team.id}`}>
                    <h3 className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-1">
                      {team.name}
                    </h3>
                  </Link>
                  {team.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {team.description}
                    </p>
                  )}
                </div>
                <Badge variant={team.status === 'recruiting' ? 'default' : 'secondary'} className="text-xs capitalize flex-shrink-0">
                  {team.status}
                </Badge>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
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
                {team.projectType && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {team.projectType.replace('_', ' ')}
                  </Badge>
                )}
              </div>

              {team.skillsRequired && team.skillsRequired.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {team.skillsRequired.slice(0, 5).map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {team.skillsRequired.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{team.skillsRequired.length - 5} more
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end pt-2 border-t">
                <Link href={`/teams/${team.id}`}>
                  <Button variant="outline" size="sm" className="h-8">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Team
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8" />
            Community Showcase
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover amazing projects and talented teams building the future of Web3
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Toggle Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <TabsList className="grid w-full md:w-auto grid-cols-2">
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
          <div className="relative flex-1">
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
        <TabsContent value="projects" className="space-y-4">
          {/* Projects List */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-muted rounded w-full mb-2"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {searchTerm 
                  ? 'No projects found matching your search.' 
                  : 'No projects available at the moment.'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-4">
          {/* Teams List */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-muted rounded w-full mb-2"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTeams.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {searchTerm 
                  ? 'No teams found matching your search.' 
                  : 'No teams available at the moment.'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTeams.map(team => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
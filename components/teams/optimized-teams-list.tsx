'use client'

import { useState, useEffect, useMemo } from 'react'
import { useApi } from '@/hooks/use-api'
import { useImageCache } from '@/lib/image-cache'
import { useApiCache } from '@/lib/api-cache'
import { debounce, throttle } from '@/lib/performance-optimizations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, MapPin, Calendar, Star, Search, Filter } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

interface Team {
  id: string
  name: string
  description: string
  avatarUrl?: string
  skills: string[]
  maxMembers: number
  currentMemberCount: number
  status: string
  projectType: string
  location: string
  totalXp: number
  teamLevel: number
  createdAt: string
  updatedAt: string
}

interface TeamsListProps {
  initialTeams?: Team[]
  initialStats?: any
}

export function OptimizedTeamsList({ initialTeams = [], initialStats }: TeamsListProps) {
  const { execute } = useApi()
  const { getCachedImage, preloadImages } = useImageCache()
  const { getCachedData, setCachedData, invalidateCache } = useApiCache()
  
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(initialStats)
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    projectType: 'all',
    location: 'all',
    skills: [] as string[],
    minSize: 1,
    maxSize: 10
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    hasMore: false
  })

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      setFilters(prev => ({ ...prev, search: searchTerm }))
    }, 300),
    []
  )

  // Throttled scroll handler
  const throttledScroll = useMemo(
    () => throttle(() => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        loadMoreTeams()
      }
    }, 200),
    []
  )

  // Load teams with caching
  const loadTeams = async (reset = false) => {
    const page = reset ? 1 : pagination.page
    const cacheKey = `teams-${JSON.stringify(filters)}-${page}`
    
    // Check cache first
    const cachedData = getCachedData<{teams: Team[], stats: any, pagination: any}>(`/api/teams`, { ...filters, page })
    if (cachedData && !reset) {
      setTeams(cachedData.teams)
      setStats(cachedData.stats)
      setPagination(cachedData.pagination)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search: filters.search,
        status: filters.status,
        projectType: filters.projectType,
        location: filters.location,
        skills: filters.skills.join(','),
        minSize: filters.minSize.toString(),
        maxSize: filters.maxSize.toString()
      })

      const result = await execute(`/api/teams?${params}`)
      
      if (result.success) {
        const newTeams = reset ? result.data.teams : [...teams, ...result.data.teams]
        setTeams(newTeams)
        setStats(result.data.stats)
        setPagination(result.data.pagination)
        
        // Cache the response
        setCachedData(`/api/teams`, result.data, { ...filters, page }, 5 * 60 * 1000) // 5 minutes
        
        // Preload team avatars
        const avatarUrls = result.data.teams
          .map((team: Team) => team.avatarUrl)
          .filter(Boolean)
        if (avatarUrls.length > 0) {
          preloadImages(avatarUrls)
        }
      }
    } catch (error) {
      console.error('Failed to load teams:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load more teams for infinite scroll
  const loadMoreTeams = async () => {
    if (loading || !pagination.hasMore) return
    
    setPagination(prev => ({ ...prev, page: prev.page + 1 }))
    await loadTeams(false)
  }

  // Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Handle search input
  const handleSearchChange = (value: string) => {
    debouncedSearch(value)
  }

  // Load teams when filters change
  useEffect(() => {
    loadTeams(true)
  }, [filters])

  // Set up infinite scroll
  useEffect(() => {
    window.addEventListener('scroll', throttledScroll)
    return () => window.removeEventListener('scroll', throttledScroll)
  }, [throttledScroll])

  // Optimized team card component
  const TeamCard = ({ team }: { team: Team }) => {
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(team.avatarUrl)
    const [imageLoading, setImageLoading] = useState(!!team.avatarUrl)

    useEffect(() => {
      if (team.avatarUrl) {
        getCachedImage(team.avatarUrl)
          .then(setAvatarUrl)
          .catch(() => setAvatarUrl(undefined))
          .finally(() => setImageLoading(false))
      }
    }, [team.avatarUrl])

    return (
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              {imageLoading ? (
                <Skeleton className="h-12 w-12 rounded-full" />
              ) : (
                <>
                  <AvatarImage src={avatarUrl} alt={team.name} />
                  <AvatarFallback>
                    {team.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{team.name}</CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {team.description}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Skills */}
            {team.skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {team.skills.slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {team.skills.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{team.skills.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            {/* Team info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{team.currentMemberCount}/{team.maxMembers}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{team.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4" />
                <span>Level {team.teamLevel}</span>
              </div>
            </div>

            {/* Status and project type */}
            <div className="flex items-center justify-between">
              <Badge 
                variant={team.status === 'recruiting' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {team.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {team.projectType}
              </Badge>
            </div>

            {/* Created date */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Created {formatRelativeTime(team.createdAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle>Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teams..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="recruiting">Recruiting</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Project Type</label>
              <Select
                value={filters.projectType}
                onValueChange={(value) => handleFilterChange('projectType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="hackathon">Hackathon</SelectItem>
                  <SelectItem value="startup">Startup</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                  <SelectItem value="open_source">Open Source</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select
                value={filters.location}
                onValueChange={(value) => handleFilterChange('location', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">Onsite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Teams</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.recruiting}</div>
              <div className="text-sm text-muted-foreground">Recruiting</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.active}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Load more button */}
      {pagination.hasMore && !loading && (
        <div className="flex justify-center">
          <Button onClick={loadMoreTeams} variant="outline">
            Load More Teams
          </Button>
        </div>
      )}
    </div>
  )
}

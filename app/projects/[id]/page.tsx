"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProjectShowcase } from "@/components/projects/project-showcase"
import { useApi } from "@/hooks/use-api"
import { useSession } from "@/store/useSession"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import type { Project } from "@/lib/types"

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const { execute } = useApi()
  const { user } = useSession()
  const { toast } = useToast()
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const projectId = params.id as string

  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    setLoading(true)
    try {
      const result = await execute(`/api/projects/${projectId}`)
      
      if (result.success && result.data) {
        setProject(result.data)
        setIsLiked(result.data.isLiked || false)
        setIsBookmarked(result.data.isBookmarked || false)
      } else {
        toast({
          title: "Project not found",
          description: "The project you're looking for doesn't exist or is private.",
          variant: "destructive",
        })
        router.push('/projects')
      }
    } catch (error) {
      console.error("Failed to load project:", error)
      toast({
        title: "Error loading project",
        description: "Something went wrong while loading the project.",
        variant: "destructive",
      })
      router.push('/projects')
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to like projects.",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await execute(`/api/projects/${projectId}/like`, {
        method: isLiked ? 'DELETE' : 'POST'
      })

      if (result.success) {
        setIsLiked(!isLiked)
        if (project) {
          setProject({
            ...project,
            likesCount: project.likesCount + (isLiked ? -1 : 1)
          })
        }
        
        toast({
          title: isLiked ? "Removed like" : "Liked project",
          description: isLiked ? "Project removed from your likes" : "Project added to your likes"
        })
      }
    } catch (error) {
      console.error("Failed to like project:", error)
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      })
    }
  }

  const handleBookmark = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to bookmark projects.",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await execute(`/api/projects/${projectId}/bookmark`, {
        method: isBookmarked ? 'DELETE' : 'POST'
      })

      if (result.success) {
        setIsBookmarked(!isBookmarked)
        if (project) {
          setProject({
            ...project,
            bookmarksCount: project.bookmarksCount + (isBookmarked ? -1 : 1)
          })
        }
        
        toast({
          title: isBookmarked ? "Removed bookmark" : "Bookmarked project",
          description: isBookmarked ? "Project removed from your bookmarks" : "Project added to your bookmarks"
        })
      }
    } catch (error) {
      console.error("Failed to bookmark project:", error)
      toast({
        title: "Error",
        description: "Failed to update bookmark status",
        variant: "destructive",
      })
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: project?.name || 'Check out this project',
      text: project?.tagline || project?.description || 'Amazing project on ObeliskHub',
      url: window.location.href
    }

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData)
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href)
        toast({
          title: "Link copied",
          description: "Project link copied to clipboard"
        })
      }
    } catch (error) {
      console.error("Failed to share:", error)
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast({
          title: "Link copied",
          description: "Project link copied to clipboard"
        })
      } catch (clipboardError) {
        toast({
          title: "Share failed",
          description: "Unable to share or copy link",
          variant: "destructive",
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Project not found</h1>
          <p className="text-muted-foreground">The project you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <ProjectShowcase
      project={project}
      isLiked={isLiked}
      isBookmarked={isBookmarked}
      onLike={handleLike}
      onBookmark={handleBookmark}
      onShare={handleShare}
    />
  )
}

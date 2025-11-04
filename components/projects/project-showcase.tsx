"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  Heart, Bookmark, Share2, ExternalLink, Github, Globe, 
  FileText, MessageSquare, Users, Calendar, Star, Eye,
  Play, ChevronLeft, ChevronRight, Zap, Code, Palette
} from "lucide-react"
import { formatRelativeTime, formatDate } from "@/lib/utils"
import type { Project, ProjectContributor, ProjectUpdate } from "@/lib/types"

interface ProjectShowcaseProps {
  project: Project
  isLiked?: boolean
  isBookmarked?: boolean
  onLike?: () => void
  onBookmark?: () => void
  onShare?: () => void
}

const PROJECT_TYPE_ICONS = {
  web_app: Globe,
  mobile_app: Zap,
  game: Play,
  defi: Star,
  nft: Palette,
  dao: Users,
  tool: Code,
  library: FileText,
  other: Code
}

const PROJECT_TYPE_COLORS = {
  web_app: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  mobile_app: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  game: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  defi: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  nft: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  dao: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  tool: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  library: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
}

const ROLE_COLORS = {
  lead: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  developer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  designer: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  pm: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  marketing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  contributor: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
}

export function ProjectShowcase({ 
  project, 
  isLiked = false, 
  isBookmarked = false, 
  onLike, 
  onBookmark, 
  onShare 
}: ProjectShowcaseProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0)
  const [activeMediaTab, setActiveMediaTab] = useState<'screenshots' | 'videos'>('screenshots')

  const allImages = [
    ...(project.bannerImage ? [project.bannerImage] : []),
    ...project.screenshots,
    ...project.demoImages
  ]

  const ProjectTypeIcon = PROJECT_TYPE_ICONS[project.projectType || 'other']

  const nextImage = () => {
    if (activeMediaTab === 'screenshots') {
      setSelectedImageIndex((prev) => (prev + 1) % allImages.length)
    } else {
      setSelectedVideoIndex((prev) => (prev + 1) % project.videos.length)
    }
  }

  const prevImage = () => {
    if (activeMediaTab === 'screenshots') {
      setSelectedImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
    } else {
      setSelectedVideoIndex((prev) => (prev - 1 + project.videos.length) % project.videos.length)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Banner */}
      <div className="relative h-[60vh] overflow-hidden">
        {project.bannerImage ? (
          <Image
            src={project.bannerImage}
            alt={project.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <ProjectTypeIcon className="h-24 w-24 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="container max-w-6xl mx-auto">
            <div className="flex items-end gap-6">
              {/* Project Logo */}
              {project.logoImage && (
                <div className="flex-shrink-0">
                  <Image
                    src={project.logoImage}
                    alt={`${project.name} logo`}
                    width={120}
                    height={120}
                    className="rounded-lg border-4 border-white/20 bg-background/80 p-2"
                  />
                </div>
              )}
              
              {/* Project Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold truncate">{project.name}</h1>
                  {project.isFeatured && (
                    <Badge className="bg-yellow-500 text-yellow-900">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </div>
                
                {project.tagline && (
                  <p className="text-xl text-white/90 mb-4">{project.tagline}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-white/80">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {project.viewsCount.toLocaleString()} views
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {project.likesCount} likes
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatRelativeTime(project.createdAt)}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                {project.demoUrl && (
                  <Button asChild size="lg">
                    <Link href={project.demoUrl} target="_blank">
                      <Play className="h-4 w-4 mr-2" />
                      Try Demo
                    </Link>
                  </Button>
                )}
                {project.githubUrl && (
                  <Button variant="outline" asChild size="lg">
                    <Link href={project.githubUrl} target="_blank">
                      <Github className="h-4 w-4 mr-2" />
                      Source
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Media & Description */}
          <div className="lg:col-span-2 space-y-8">
            {/* Media Gallery */}
            {(allImages.length > 0 || project.videos.length > 0) && (
              <Card>
                <CardContent className="p-6">
                  <Tabs value={activeMediaTab} onValueChange={(value) => setActiveMediaTab(value as any)}>
                    <TabsList className="mb-4">
                      {allImages.length > 0 && (
                        <TabsTrigger value="screenshots">Screenshots ({allImages.length})</TabsTrigger>
                      )}
                      {project.videos.length > 0 && (
                        <TabsTrigger value="videos">Videos ({project.videos.length})</TabsTrigger>
                      )}
                    </TabsList>
                    
                    <TabsContent value="screenshots" className="space-y-4">
                      {allImages.length > 0 && (
                        <>
                          <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                            <Image
                              src={allImages[selectedImageIndex]}
                              alt={`${project.name} screenshot ${selectedImageIndex + 1}`}
                              fill
                              className="object-cover"
                            />
                            {allImages.length > 1 && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                                  onClick={prevImage}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                                  onClick={nextImage}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                          
                          {/* Thumbnail Strip */}
                          {allImages.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {allImages.map((image, index) => (
                                <button
                                  key={index}
                                  onClick={() => setSelectedImageIndex(index)}
                                  className={`flex-shrink-0 w-20 h-12 rounded overflow-hidden border-2 transition-colors ${
                                    index === selectedImageIndex 
                                      ? 'border-primary' 
                                      : 'border-transparent hover:border-muted-foreground'
                                  }`}
                                >
                                  <Image
                                    src={image}
                                    alt={`Thumbnail ${index + 1}`}
                                    width={80}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="videos" className="space-y-4">
                      {project.videos.length > 0 && (
                        <>
                          <div className="aspect-video">
                            <iframe
                              src={project.videos[selectedVideoIndex]}
                              title={`${project.name} video ${selectedVideoIndex + 1}`}
                              className="w-full h-full rounded-lg"
                              allowFullScreen
                            />
                          </div>
                          
                          {project.videos.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {project.videos.map((video, index) => (
                                <Button
                                  key={index}
                                  variant={index === selectedVideoIndex ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setSelectedVideoIndex(index)}
                                >
                                  Video {index + 1}
                                </Button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4">About This Project</h2>
                {project.description && (
                  <p className="text-muted-foreground mb-4">{project.description}</p>
                )}
                {project.longDescription && (
                  <div className="prose prose-sm max-w-none">
                    <p>{project.longDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Updates */}
            {project.updates && project.updates.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4">Recent Updates</h2>
                  <div className="space-y-4">
                    {project.updates.slice(0, 3).map((update) => (
                      <div key={update.id} className="border-l-2 border-primary/20 pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{update.title}</h3>
                          {update.version && (
                            <Badge variant="outline">{update.version}</Badge>
                          )}
                          <Badge variant="secondary" className="capitalize">
                            {update.updateType}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{update.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(update.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Project Details */}
          <div className="space-y-6">
            {/* Engagement Actions */}
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <Button
                    variant={isLiked ? "default" : "outline"}
                    onClick={onLike}
                    className="flex-1 mr-2"
                  >
                    <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                    {project.likesCount}
                  </Button>
                  <Button
                    variant={isBookmarked ? "default" : "outline"}
                    onClick={onBookmark}
                    className="flex-1 mx-1"
                  >
                    <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                    Save
                  </Button>
                  <Button variant="outline" onClick={onShare} className="flex-1 ml-2">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Project Info */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-lg">Project Details</h3>
                
                {project.projectType && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <div className="mt-1">
                      <Badge className={PROJECT_TYPE_COLORS[project.projectType]}>
                        <ProjectTypeIcon className="h-3 w-3 mr-1" />
                        {project.projectType.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                )}

                {project.status && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge variant="outline" className="capitalize">
                        {project.status.replace('_', ' ')}
                      </Badge>
                      {project.progress > 0 && (
                        <div className="mt-2">
                          <Progress value={project.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">{project.progress}% complete</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {project.category.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Categories</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {project.category.map((cat) => (
                        <Badge key={cat} variant="secondary">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {project.techStack.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tech Stack</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {project.techStack.map((tech) => (
                        <Badge key={tech} variant="outline">{tech}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {project.blockchain.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Blockchain</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {project.blockchain.map((chain) => (
                        <Badge key={chain} variant="outline">{chain}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Links */}
                <div className="space-y-2">
                  {project.websiteUrl && (
                    <Button variant="ghost" asChild className="w-full justify-start">
                      <Link href={project.websiteUrl} target="_blank">
                        <Globe className="h-4 w-4 mr-2" />
                        Website
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </Link>
                    </Button>
                  )}
                  {project.docsUrl && (
                    <Button variant="ghost" asChild className="w-full justify-start">
                      <Link href={project.docsUrl} target="_blank">
                        <FileText className="h-4 w-4 mr-2" />
                        Documentation
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </Link>
                    </Button>
                  )}
                  {project.discordUrl && (
                    <Button variant="ghost" asChild className="w-full justify-start">
                      <Link href={project.discordUrl} target="_blank">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Discord
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Team & Contributors */}
            {project.contributors && project.contributors.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Team</h3>
                  <div className="space-y-3">
                    {project.contributors.map((contributor) => (
                      <div key={contributor.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={contributor.user?.avatarUrl} />
                          <AvatarFallback>
                            {contributor.user?.displayName?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {contributor.user?.displayName}
                          </p>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${ROLE_COLORS[contributor.role]}`}
                          >
                            {contributor.role.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Stats */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4">Statistics</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Views</span>
                    <span className="font-medium">{project.viewsCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Likes</span>
                    <span className="font-medium">{project.likesCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bookmarks</span>
                    <span className="font-medium">{project.bookmarksCount}</span>
                  </div>
                  {project.githubStars > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GitHub Stars</span>
                      <span className="font-medium">{project.githubStars}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">{formatDate(project.createdAt)}</span>
                  </div>
                  {project.launchDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Launched</span>
                      <span className="font-medium">{formatDate(project.launchDate)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

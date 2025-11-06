'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { FlipbookMagazine } from '@/components/magazine/flipbook-magazine'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, BookOpen, Calendar, FileText, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface Magazine {
  id: string
  title: string
  description: string | null
  issue_number: number
  issue_date: string
  status: 'draft' | 'published' | 'archived'
  cover_image_url: string | null
  magazine_pages?: any[]
}

interface MagazineCatalogueProps {
  onClose: () => void
}

function MagazineCatalogue({ onClose }: MagazineCatalogueProps) {
  const [magazines, setMagazines] = useState<Magazine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMagazines()
  }, [])

  const fetchMagazines = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/magazines?status=all')
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Filter to show only published magazines in the catalogue
        const publishedMagazines = data.data.magazines.filter((mag: Magazine) => mag.status === 'published')
        setMagazines(publishedMagazines)
      } else {
        toast.error('Failed to fetch magazines')
      }
    } catch (error) {
      console.error('Error fetching magazines:', error)
      toast.error('Error fetching magazines')
    } finally {
      setLoading(false)
    }
  }

  const handleViewMagazine = (magazineId: string) => {
    window.open(`/magazine?id=${magazineId}`, '_blank')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500'
      case 'draft': return 'bg-yellow-500'
      case 'archived': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <p className="text-lg text-muted-foreground">Loading magazine catalogue...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Magazine Catalogue</h1>
              <p className="text-muted-foreground">Browse our collection of Web3 Recap magazines</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {magazines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No magazines available</h3>
            <p className="text-muted-foreground text-center mb-4">
              Check back soon for new magazine issues!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {magazines.map((magazine) => (
            <Card 
              key={magazine.id} 
              className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
              onClick={() => handleViewMagazine(magazine.id)}
            >
              {/* Magazine Cover */}
              <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                {magazine.magazine_pages && magazine.magazine_pages.length > 0 ? (
                  // Use the cover page image
                  <img 
                    src={magazine.magazine_pages.find(page => page.page_type === 'cover')?.image_url || magazine.magazine_pages[0]?.image_url || '/logo.png'} 
                    alt={magazine.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = '/logo.png'
                    }}
                  />
                ) : magazine.cover_image_url ? (
                  // Fallback to cover_image_url
                  <img 
                    src={magazine.cover_image_url} 
                    alt={magazine.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = '/logo.png'
                    }}
                  />
                ) : (
                  // Default placeholder
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                
                {/* Overlay with magazine info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getStatusColor(magazine.status)}>
                        {magazine.status}
                      </Badge>
                      <div className="flex items-center text-white text-sm">
                        <FileText className="h-4 w-4 mr-1" />
                        {magazine.magazine_pages?.length || 0} pages
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-white text-sm font-medium">
                        <Eye className="h-4 w-4 mr-2 inline" />
                        Click to Read
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Magazine Info */}
              <CardContent className="p-4">
                <div className="space-y-2">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
                    {magazine.title}
                  </CardTitle>
                  
                  <div className="flex items-center space-x-2 text-muted-foreground text-sm">
                    <span className="font-medium">Issue #{magazine.issue_number}</span>
                    <span>•</span>
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(magazine.issue_date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {magazine.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {magazine.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MagazinePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const magazineId = searchParams.get('id')
  
  const [magazine, setMagazine] = useState<Magazine | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (magazineId) {
      fetchMagazine()
    } else {
      // If no specific magazine ID, we could show a list of available magazines
      setLoading(false)
    }
  }, [magazineId])

  const fetchMagazine = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/magazines/${magazineId}`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        setMagazine(data.data.magazine)
      } else {
        setError(data.error || 'Failed to load magazine')
        toast.error('Failed to load magazine')
      }
    } catch (error) {
      console.error('Error fetching magazine:', error)
      setError('Error loading magazine')
      toast.error('Error loading magazine')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <p className="text-lg text-muted-foreground">Loading magazine...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <BookOpen className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Magazine Not Found</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!magazine) {
    return <MagazineCatalogue onClose={handleClose} />
  }

  return <FlipbookMagazine magazine={magazine} onClose={handleClose} />
}

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, ArrowLeft, Upload, Eye, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

interface Magazine {
  id: string
  title: string
  description: string | null
  issue_number: number
  issue_date: string
  status: 'draft' | 'published' | 'archived'
  cover_image_url: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  magazine_pages?: MagazinePage[]
}

interface MagazinePage {
  id: string
  magazine_id: string
  page_number: number
  page_title: string | null
  image_url: string
  page_type: 'cover' | 'content' | 'back_cover'
  sort_order: number
}

export default function MagazineEditor() {
  const params = useParams()
  const router = useRouter()
  const magazineId = params.id as string

  const [magazine, setMagazine] = useState<Magazine | null>(null)
  const [pages, setPages] = useState<MagazinePage[]>([])
  const [loading, setLoading] = useState(true)
  const [isPageDialogOpen, setIsPageDialogOpen] = useState(false)
  const [editingPage, setEditingPage] = useState<MagazinePage | null>(null)

  // Form state
  const [pageFormData, setPageFormData] = useState({
    page_number: 1,
    page_title: '',
    image_url: '',
    page_type: 'content' as 'cover' | 'content' | 'back_cover',
    sort_order: 1
  })

  useEffect(() => {
    if (magazineId) {
      fetchMagazine()
      fetchPages()
    }
  }, [magazineId])

  const fetchMagazine = async () => {
    try {
      const response = await fetch(`/api/magazines/${magazineId}`)
      const data = await response.json()
      
      if (response.ok) {
        setMagazine(data.magazine)
      } else {
        toast.error('Failed to fetch magazine')
      }
    } catch (error) {
      console.error('Error fetching magazine:', error)
      toast.error('Error fetching magazine')
    }
  }

  const fetchPages = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/magazines/${magazineId}/pages`)
      const data = await response.json()
      
      if (response.ok) {
        setPages(data.pages || [])
      } else {
        toast.error('Failed to fetch pages')
      }
    } catch (error) {
      console.error('Error fetching pages:', error)
      toast.error('Error fetching pages')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePage = async () => {
    try {
      const response = await fetch(`/api/magazines/${magazineId}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pageFormData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Page created successfully!')
        setIsPageDialogOpen(false)
        setPageFormData({
          page_number: pages.length + 1,
          page_title: '',
          image_url: '',
          page_type: 'content',
          sort_order: pages.length + 1
        })
        fetchPages()
      } else {
        toast.error(data.error || 'Failed to create page')
      }
    } catch (error) {
      console.error('Error creating page:', error)
      toast.error('Error creating page')
    }
  }

  const handleEditPage = (page: MagazinePage) => {
    setEditingPage(page)
    setPageFormData({
      page_number: page.page_number,
      page_title: page.page_title || '',
      image_url: page.image_url,
      page_type: page.page_type,
      sort_order: page.sort_order
    })
    setIsPageDialogOpen(true)
  }

  const handleUpdatePage = async () => {
    if (!editingPage) return

    try {
      const response = await fetch(`/api/magazines/${magazineId}/pages/${editingPage.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pageFormData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Page updated successfully!')
        setIsPageDialogOpen(false)
        setEditingPage(null)
        setPageFormData({
          page_number: 1,
          page_title: '',
          image_url: '',
          page_type: 'content',
          sort_order: 1
        })
        fetchPages()
      } else {
        toast.error(data.error || 'Failed to update page')
      }
    } catch (error) {
      console.error('Error updating page:', error)
      toast.error('Error updating page')
    }
  }

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) {
      return
    }

    try {
      const response = await fetch(`/api/magazines/${magazineId}/pages/${pageId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Page deleted successfully!')
        fetchPages()
      } else {
        toast.error('Failed to delete page')
      }
    } catch (error) {
      console.error('Error deleting page:', error)
      toast.error('Error deleting page')
    }
  }

  const handlePreviewMagazine = () => {
    if (magazine) {
      window.open(`/magazine?id=${magazine.id}`, '_blank')
    }
  }

  const getPageTypeColor = (type: string) => {
    switch (type) {
      case 'cover': return 'bg-blue-500'
      case 'back_cover': return 'bg-purple-500'
      default: return 'bg-green-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading magazine...</div>
      </div>
    )
  }

  if (!magazine) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Magazine not found</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{magazine.title}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <Badge className="bg-blue-500">
                Issue #{magazine.issue_number}
              </Badge>
              <Badge className={magazine.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'}>
                {magazine.status}
              </Badge>
              <span className="text-muted-foreground">
                {new Date(magazine.issue_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handlePreviewMagazine}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>

      {magazine.description && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{magazine.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Pages ({pages.length})</h2>
        
        <Dialog open={isPageDialogOpen} onOpenChange={setIsPageDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingPage(null)
              setPageFormData({
                page_number: pages.length + 1,
                page_title: '',
                image_url: '',
                page_type: 'content',
                sort_order: pages.length + 1
              })
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Page
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPage ? 'Edit Page' : 'Add New Page'}
              </DialogTitle>
              <DialogDescription>
                {editingPage ? 'Update page details' : 'Add a new page to the magazine'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="page_number">Page Number</Label>
                  <Input
                    id="page_number"
                    type="number"
                    value={pageFormData.page_number}
                    onChange={(e) => setPageFormData({ ...pageFormData, page_number: parseInt(e.target.value) || 1 })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={pageFormData.sort_order}
                    onChange={(e) => setPageFormData({ ...pageFormData, sort_order: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="page_title">Page Title</Label>
                <Input
                  id="page_title"
                  value={pageFormData.page_title}
                  onChange={(e) => setPageFormData({ ...pageFormData, page_title: e.target.value })}
                  placeholder="e.g., Table of Contents"
                />
              </div>
              
              <div>
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={pageFormData.image_url}
                  onChange={(e) => setPageFormData({ ...pageFormData, image_url: e.target.value })}
                  placeholder="https://example.com/image.png"
                />
              </div>
              
              <div>
                <Label htmlFor="page_type">Page Type</Label>
                <Select
                  value={pageFormData.page_type}
                  onValueChange={(value: 'cover' | 'content' | 'back_cover') => 
                    setPageFormData({ ...pageFormData, page_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Cover</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="back_cover">Back Cover</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsPageDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={editingPage ? handleUpdatePage : handleCreatePage}>
                  {editingPage ? 'Update' : 'Add'} Page
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pages yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add pages to your magazine by uploading A4 PNG images.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages.sort((a, b) => a.sort_order - b.sort_order).map((page) => (
            <Card key={page.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      Page {page.page_number}
                    </CardTitle>
                    {page.page_title && (
                      <CardDescription className="mt-1">
                        {page.page_title}
                      </CardDescription>
                    )}
                  </div>
                  <Badge className={getPageTypeColor(page.page_type)}>
                    {page.page_type}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                {page.image_url && (
                  <div className="mb-4">
                    <img 
                      src={page.image_url} 
                      alt={`Page ${page.page_number}`}
                      className="w-full h-32 object-cover rounded-md border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Order: {page.sort_order}
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPage(page)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePage(page.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

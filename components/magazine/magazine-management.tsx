'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Eye, Upload, BookOpen, Calendar, FileText, Image, ArrowUp, ArrowDown, X, GripVertical, SortAsc, SortDesc, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useApi } from '@/hooks/use-api'
import { useSession } from '@/store/useSession'

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

export function MagazineManagement() {
  const { user } = useSession()
  const { execute } = useApi()
  const [magazines, setMagazines] = useState<Magazine[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingMagazine, setEditingMagazine] = useState<Magazine | null>(null)
  const [selectedMagazine, setSelectedMagazine] = useState<Magazine | null>(null)
  const [isPageEditorOpen, setIsPageEditorOpen] = useState(false)
  const [editingPage, setEditingPage] = useState<MagazinePage | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [draggedPage, setDraggedPage] = useState<MagazinePage | null>(null)
  const [tempPages, setTempPages] = useState<MagazinePage[]>([])
  const [bulkUploadFiles, setBulkUploadFiles] = useState<File[]>([])

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    issue_number: 1,
    issue_date: '',
    status: 'draft' as 'draft' | 'published' | 'archived'
  })

  // Page form state
  const [pageFormData, setPageFormData] = useState({
    page_number: 1,
    page_title: '',
    image_url: '',
    page_type: 'content' as 'cover' | 'content' | 'back_cover',
    sort_order: 1
  })

  useEffect(() => {
    fetchMagazines()
  }, [])

  const fetchMagazines = async () => {
    try {
      setLoading(true)
      
      const result = await execute('/api/magazines?status=all', {
        method: 'GET',
        headers: {
          ...(user && { 'x-user-id': user.id })
        }
      })
      
      if (result.success && result.data?.magazines) {
        setMagazines(result.data.magazines)
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

  const handleCreateMagazine = async () => {
    if (!user) {
      toast.error('Please sign in to create magazines')
      return
    }

    try {
      const result = await execute('/api/magazines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(formData),
      })

      if (result.success && result.data?.magazine) {
        toast.success('Magazine created successfully!')
        setIsCreateDialogOpen(false)
        setFormData({
          title: '',
          description: '',
          issue_number: 1,
          issue_date: '',
          status: 'draft'
        })
        fetchMagazines()
      } else {
        toast.error(result.error || 'Failed to create magazine')
      }
    } catch (error) {
      console.error('Error creating magazine:', error)
      toast.error('Error creating magazine')
    }
  }

  const handleEditMagazine = (magazine: Magazine) => {
    setEditingMagazine(magazine)
    setFormData({
      title: magazine.title,
      description: magazine.description || '',
      issue_number: magazine.issue_number,
      issue_date: magazine.issue_date,
      status: magazine.status
    })
    setIsCreateDialogOpen(true)
  }

  const handleUpdateMagazine = async () => {
    if (!editingMagazine || !user) return

    try {
      const result = await execute(`/api/magazines/${editingMagazine.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(formData),
      })

      if (result.success) {
        toast.success('Magazine updated successfully!')
        setIsCreateDialogOpen(false)
        setEditingMagazine(null)
        setFormData({
          title: '',
          description: '',
          issue_number: 1,
          issue_date: '',
          status: 'draft'
        })
        fetchMagazines()
      } else {
        toast.error(result.error || 'Failed to update magazine')
      }
    } catch (error) {
      console.error('Error updating magazine:', error)
      toast.error('Error updating magazine')
    }
  }

  const handleDeleteMagazine = async (magazineId: string) => {
    if (!confirm('Are you sure you want to delete this magazine? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/magazines/${magazineId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Magazine deleted successfully!')
        fetchMagazines()
      } else {
        toast.error('Failed to delete magazine')
      }
    } catch (error) {
      console.error('Error deleting magazine:', error)
      toast.error('Error deleting magazine')
    }
  }

  const handlePreviewMagazine = (magazineId: string) => {
    window.open(`/magazine?id=${magazineId}`, '_blank')
  }

  const handleOpenPageEditor = (magazine: Magazine) => {
    setSelectedMagazine(magazine)
    setIsPageEditorOpen(true)
  }

  const handleOpenBuilder = (magazine: Magazine) => {
    window.open(`/magazine/builder?id=${magazine.id}`, '_blank')
  }

  const handleImageUpload = async (file: File) => {
    if (!user) {
      toast.error('Please sign in to upload images')
      return null
    }

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'magazine-images')

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-user-id': user.id,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success('Image uploaded successfully!')
        return data.data.publicUrl
      } else {
        toast.error(data.error || 'Failed to upload image')
        return null
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Error uploading image')
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleAddPage = async () => {
    if (!selectedMagazine) return

    try {
      const result = await execute(`/api/magazines/${selectedMagazine.id}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify(pageFormData),
      })

      if (result.success) {
        toast.success('Page added successfully!')
        setPageFormData({
          page_number: (selectedMagazine.magazine_pages?.length || 0) + 2,
          page_title: '',
          image_url: '',
          page_type: 'content',
          sort_order: (selectedMagazine.magazine_pages?.length || 0) + 1
        })
        fetchMagazines()
      } else {
        toast.error(result.error || 'Failed to add page')
      }
    } catch (error) {
      console.error('Error adding page:', error)
      toast.error('Error adding page')
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
  }

  const handleUpdatePage = async () => {
    if (!editingPage || !selectedMagazine) return

    try {
      const result = await execute(`/api/magazines/${selectedMagazine.id}/pages/${editingPage.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify(pageFormData),
      })

      if (result.success) {
        toast.success('Page updated successfully!')
        setEditingPage(null)
        setPageFormData({
          page_number: 1,
          page_title: '',
          image_url: '',
          page_type: 'content',
          sort_order: 1
        })
        fetchMagazines()
      } else {
        toast.error(result.error || 'Failed to update page')
      }
    } catch (error) {
      console.error('Error updating page:', error)
      toast.error('Error updating page')
    }
  }

  const handleDeletePage = async (pageId: string) => {
    if (!selectedMagazine || !confirm('Are you sure you want to delete this page?')) return

    try {
      const result = await execute(`/api/magazines/${selectedMagazine.id}/pages/${pageId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.id || '',
        },
      })

      if (result.success) {
        toast.success('Page deleted successfully!')
        fetchMagazines()
      } else {
        toast.error(result.error || 'Failed to delete page')
      }
    } catch (error) {
      console.error('Error deleting page:', error)
      toast.error('Error deleting page')
    }
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
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading magazines...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Magazine Management</h2>
          <p className="text-muted-foreground">Create and manage your monthly magazines</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingMagazine(null)
              setFormData({
                title: '',
                description: '',
                issue_number: 1,
                issue_date: '',
                status: 'draft'
              })
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Magazine
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMagazine ? 'Edit Magazine' : 'Create New Magazine'}
              </DialogTitle>
              <DialogDescription>
                {editingMagazine ? 'Update magazine details' : 'Create a new magazine issue'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Web3 Recap Magazine - January 2024"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Magazine description..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issue_number">Issue Number</Label>
                  <Input
                    id="issue_number"
                    type="number"
                    value={formData.issue_number}
                    onChange={(e) => setFormData({ ...formData, issue_number: parseInt(e.target.value) || 1 })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="issue_date">Issue Date</Label>
                  <Input
                    id="issue_date"
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'draft' | 'published' | 'archived') => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={editingMagazine ? handleUpdateMagazine : handleCreateMagazine}>
                  {editingMagazine ? 'Update' : 'Create'} Magazine
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {magazines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No magazines yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first magazine to get started with the digital publishing system.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {magazines.map((magazine) => (
            <Card key={magazine.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{magazine.title}</CardTitle>
                    <CardDescription className="mt-1 flex items-center space-x-2">
                      <span>Issue #{magazine.issue_number}</span>
                      <span>•</span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(magazine.issue_date).toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(magazine.status)}>
                    {magazine.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                {magazine.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {magazine.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    {magazine.magazine_pages?.length || 0} pages
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditMagazine(magazine)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenBuilder(magazine)}
                      title="Open Builder"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <BookOpen className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenPageEditor(magazine)}
                      title="Manage Pages"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewMagazine(magazine.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMagazine(magazine.id)}
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

      {/* Page Editor Dialog */}
      <Dialog open={isPageEditorOpen} onOpenChange={setIsPageEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Manage Pages - {selectedMagazine?.title}
            </DialogTitle>
            <DialogDescription>
              Upload images and manage pages for your magazine
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add New Page Form */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">
                {editingPage ? 'Edit Page' : 'Add New Page'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="mt-4">
                <Label htmlFor="page_title">Page Title (Optional)</Label>
                <Input
                  id="page_title"
                  value={pageFormData.page_title}
                  onChange={(e) => setPageFormData({ ...pageFormData, page_title: e.target.value })}
                  placeholder="e.g., Table of Contents, Article Title"
                />
              </div>

              <div className="mt-4">
                <Label>Upload Image</Label>
                <div className="mt-2 flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const url = await handleImageUpload(file)
                        if (url) {
                          setPageFormData({ ...pageFormData, image_url: url })
                        }
                      }
                    }}
                    className="hidden"
                    id="image-upload"
                    disabled={uploadingImage}
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingImage ? 'Uploading...' : 'Choose Image'}
                  </label>
                  
                  {pageFormData.image_url && (
                    <div className="flex items-center space-x-2">
                      <img 
                        src={pageFormData.image_url} 
                        alt="Preview" 
                        className="h-16 w-16 object-cover rounded border"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPageFormData({ ...pageFormData, image_url: '' })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-4">
                {editingPage && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditingPage(null)
                      setPageFormData({
                        page_number: 1,
                        page_title: '',
                        image_url: '',
                        page_type: 'content',
                        sort_order: 1
                      })
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
                <Button 
                  onClick={editingPage ? handleUpdatePage : handleAddPage}
                  disabled={!pageFormData.image_url || uploadingImage}
                >
                  {editingPage ? 'Update Page' : 'Add Page'}
                </Button>
              </div>
            </div>

            {/* Existing Pages List */}
            {selectedMagazine?.magazine_pages && selectedMagazine.magazine_pages.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Existing Pages</h3>
                <div className="space-y-3">
                  {selectedMagazine.magazine_pages
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((page) => (
                    <div key={page.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        <img 
                          src={page.image_url} 
                          alt={page.page_title || `Page ${page.page_number}`}
                          className="h-20 w-16 object-cover rounded border"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">Page {page.page_number}</Badge>
                          <Badge variant="secondary">{page.page_type}</Badge>
                        </div>
                        {page.page_title && (
                          <p className="text-sm text-muted-foreground mt-1">{page.page_title}</p>
                        )}
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
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  ArrowLeft, 
  Upload, 
  Save, 
  Eye, 
  Trash2, 
  GripVertical, 
  Plus,
  Edit,
  X,
  RefreshCw,
  BookOpen,
  Calendar,
  FileText,
  Image as ImageIcon,
  SortAsc,
  SortDesc
} from 'lucide-react'
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

interface BulkUploadFile {
  file: File
  preview: string
  pageTitle: string
  pageType: 'cover' | 'content' | 'back_cover'
}

export default function MagazineBuilder() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const magazineId = searchParams.get('id')
  const { user } = useSession()
  const { execute } = useApi()
  
  const [magazine, setMagazine] = useState<Magazine | null>(null)
  const [pages, setPages] = useState<MagazinePage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [bulkFiles, setBulkFiles] = useState<BulkUploadFile[]>([])
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [draggedPage, setDraggedPage] = useState<MagazinePage | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (magazineId) {
      fetchMagazine()
    }
  }, [magazineId])

  const fetchMagazine = async () => {
    try {
      setLoading(true)
      const result = await execute(`/api/magazines/${magazineId}`, {
        method: 'GET',
        headers: {
          ...(user && { 'x-user-id': user.id })
        }
      })
      
      if (result.success && result.data?.magazine) {
        setMagazine(result.data.magazine)
        const sortedPages = (result.data.magazine.magazine_pages || []).sort((a: MagazinePage, b: MagazinePage) => a.sort_order - b.sort_order)
        setPages(sortedPages)
        console.log('Fetched pages:', sortedPages)
      } else {
        toast.error('Failed to fetch magazine')
        router.push('/news/manage')
      }
    } catch (error) {
      console.error('Error fetching magazine:', error)
      toast.error('Error fetching magazine')
      router.push('/news/manage')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkFileSelect = (files: FileList) => {
    const newFiles: BulkUploadFile[] = []
    
    Array.from(files).forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file)
        const pageNumber = pages.length + index + 1
        
        newFiles.push({
          file,
          preview,
          pageTitle: `Page ${pageNumber}`,
          pageType: index === 0 ? 'cover' : 'content'
        })
      }
    })
    
    setBulkFiles(prev => [...prev, ...newFiles])
  }

  const updateBulkFile = (index: number, updates: Partial<BulkUploadFile>) => {
    setBulkFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, ...updates } : file
    ))
  }

  const removeBulkFile = (index: number) => {
    setBulkFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index)
      URL.revokeObjectURL(prev[index].preview)
      return newFiles
    })
  }

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return
    if (!user) {
      toast.error('Please sign in to upload pages')
      return
    }
    if (!magazineId) {
      toast.error('Magazine ID is missing')
      return
    }
    
    setUploading(true)
      const uploadedPages: MagazinePage[] = []
    const failedUploads: { file: string; error: string }[] = []
      
    try {
      for (let i = 0; i < bulkFiles.length; i++) {
        const bulkFile = bulkFiles[i]
        
        try {
        // Upload image
        const formData = new FormData()
        formData.append('file', bulkFile.file)
        formData.append('bucket', 'magazine-images')

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
              'x-user-id': user.id,
          },
          body: formData,
        })

        const uploadData = await uploadResponse.json()
        
        if (!uploadResponse.ok || !uploadData.success) {
            throw new Error(uploadData.error || `Upload failed for "${bulkFile.file.name}"`)
        }

          // Calculate page number and sort order based on existing pages and current batch
        const existingPageNumbers = pages.map(p => p.page_number).sort((a, b) => a - b)
        const existingSortOrders = pages.map(p => p.sort_order).sort((a, b) => a - b)
          
          // Find the maximum existing values
          const maxPageNumber = existingPageNumbers.length > 0 ? Math.max(...existingPageNumbers) : 0
          const maxSortOrder = existingSortOrders.length > 0 ? Math.max(...existingSortOrders) : 0
          
          // Calculate for this page (starting from max + 1 + index in batch)
          const pageNumber = maxPageNumber + i + 1
          const sortOrder = maxSortOrder + i + 1

        // Create page
        const pageData = {
            page_number: pageNumber,
          page_title: bulkFile.pageTitle,
          image_url: uploadData.data.publicUrl,
          page_type: bulkFile.pageType,
            sort_order: sortOrder
        }

        const pageResponse = await fetch(`/api/magazines/${magazineId}/pages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
              'x-user-id': user.id,
          },
          body: JSON.stringify(pageData),
        })

        const pageResult = await pageResponse.json()
        
        if (!pageResponse.ok || !pageResult.success) {
            throw new Error(pageResult.error || `Failed to create page for "${bulkFile.file.name}"`)
        }

        uploadedPages.push(pageResult.data.page)
        } catch (error) {
          console.error(`Error uploading file ${i + 1}:`, error)
          failedUploads.push({
            file: bulkFile.file.name || `File ${i + 1}`,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // Update pages only if we have successful uploads
      if (uploadedPages.length > 0) {
      setPages(prev => [...prev, ...uploadedPages])
        toast.success(`Successfully uploaded ${uploadedPages.length} of ${bulkFiles.length} page(s)!`)
      } else {
        toast.error('Failed to upload any pages. Please check your files and try again.')
      }

      // Show errors for failed uploads
      if (failedUploads.length > 0) {
        const errorMessage = failedUploads.map(f => `${f.file}: ${f.error}`).join('\n')
        console.error('Failed uploads:', errorMessage)
        toast.error(`${failedUploads.length} file(s) failed to upload. Check console for details.`)
      }

      // Clear bulk files only if all uploads succeeded
      if (failedUploads.length === 0) {
      setBulkFiles([])
      setIsBulkUploadOpen(false)
      }
      
    } catch (error) {
      console.error('Bulk upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload pages')
    } finally {
      setUploading(false)
    }
  }

  const handleDragStart = (page: MagazinePage, index: number) => {
    setDraggedPage(page)
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedPage === null) return
    
    console.log('Drag and drop:', { draggedIndex, dropIndex, draggedPage: draggedPage.page_title })
    
    const newPages = [...pages]
    const draggedItem = newPages[draggedIndex]
    
    // Remove dragged item
    newPages.splice(draggedIndex, 1)
    
    // Insert at new position
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex
    newPages.splice(insertIndex, 0, draggedItem)
    
    // Update sort_order and page_number
    const updatedPages = newPages.map((page, index) => ({
      ...page,
      sort_order: index + 1,
      page_number: index + 1
    }))
    
    console.log('Updated pages after drag and drop:', updatedPages.map(p => ({ id: p.id, title: p.page_title, sort_order: p.sort_order, page_number: p.page_number })))
    setPages(updatedPages)
    setDraggedPage(null)
    setDraggedIndex(null)
  }

  const updatePageTitle = async (pageId: string, newTitle: string) => {
    try {
      const result = await execute(`/api/magazines/${magazineId}/pages/${pageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({ page_title: newTitle }),
      })

      if (result.success) {
        setPages(prev => prev.map(page => 
          page.id === pageId ? { ...page, page_title: newTitle } : page
        ))
        toast.success('Page title updated')
      } else {
        toast.error('Failed to update page title')
      }
    } catch (error) {
      console.error('Error updating page title:', error)
      toast.error('Error updating page title')
    }
  }

  const updatePageType = async (pageId: string, newType: 'cover' | 'content' | 'back_cover') => {
    try {
      const result = await execute(`/api/magazines/${magazineId}/pages/${pageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({ page_type: newType }),
      })

      if (result.success) {
        setPages(prev => prev.map(page => 
          page.id === pageId ? { ...page, page_type: newType } : page
        ))
        toast.success('Page type updated')
      } else {
        toast.error('Failed to update page type')
      }
    } catch (error) {
      console.error('Error updating page type:', error)
      toast.error('Error updating page type')
    }
  }

  const deletePage = async (pageId: string) => {
    if (!magazineId || !user) {
      toast.error('Missing magazine ID or user authentication')
      return
    }

    if (!confirm('Are you sure you want to delete this page? This action cannot be undone.')) return

    try {
      const result = await execute(`/api/magazines/${magazineId}/pages/${pageId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id,
        },
      })

      if (result.success) {
        setPages(prev => prev.filter(page => page.id !== pageId))
        toast.success('Page deleted successfully')
        
        // Refresh to get updated page numbers
        await fetchMagazine()
      } else {
        toast.error(result.error || 'Failed to delete page')
      }
    } catch (error) {
      console.error('Error deleting page:', error)
      toast.error(error instanceof Error ? error.message : 'Error deleting page')
    }
  }

  const savePageOrder = async () => {
    if (!magazineId || !user) {
      toast.error('Missing magazine ID or user authentication')
      return
    }

    if (pages.length === 0) {
      toast.error('No pages to save')
      return
    }

    setSaving(true)
    try {
      console.log('Current pages state before saving:', pages)
      
      // Update pages sequentially to avoid conflicts, but batch the operations
      const updates = pages.map((page, index) => ({
        id: page.id,
        page_number: index + 1,
        sort_order: index + 1
      }))
      
      // Update all pages in parallel - the database should handle this correctly
      // with proper transaction handling
      const updatePromises = updates.map(async ({ id, page_number, sort_order }) => {
        const result = await execute(`/api/magazines/${magazineId}/pages/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id,
          },
          body: JSON.stringify({
            page_number,
            sort_order
          }),
        })
        
        if (!result.success) {
          throw new Error(`Failed to update page ${id}: ${result.error || 'Unknown error'}`)
        }
        
        return result
      })
      
      const results = await Promise.all(updatePromises)
      
      // Verify all updates succeeded
      const failedUpdates = results.filter(r => !r.success)
      if (failedUpdates.length > 0) {
        throw new Error(`Failed to update ${failedUpdates.length} page(s)`)
        }

      toast.success('Page order saved successfully!')
      
      // Refresh the magazine data to get the updated order from the server
      await fetchMagazine()
    } catch (error) {
      console.error('Error saving page order:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save page order. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const previewMagazine = () => {
    window.open(`/magazine?id=${magazineId}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
          <p className="text-lg text-muted-foreground">Loading magazine builder...</p>
        </div>
      </div>
    )
  }

  if (!magazine) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">Magazine not found</p>
          <Button onClick={() => router.push('/news/manage')} className="mt-4">
            Back to Management
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-12 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => router.push('/news/manage')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              
              <div className="h-6 w-px bg-border" />
              
              <div>
                <h1 className="text-xl font-semibold">{magazine.title}</h1>
                <p className="text-sm text-muted-foreground">Issue #{magazine.issue_number}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setIsBulkUploadOpen(true)}
                className="flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>Bulk Upload</span>
              </Button>
              
              <Button
                onClick={savePageOrder}
                disabled={saving}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Order'}</span>
              </Button>
              
              <Button
                onClick={previewMagazine}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{pages.length}</p>
                  <p className="text-sm text-muted-foreground">Total Pages</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">
                    {pages.filter(p => p.page_type === 'content').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Content Pages</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">
                    {pages.filter(p => p.page_type === 'cover').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Covers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">
                    {new Date(magazine.issue_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pages Grid */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Magazine Pages</CardTitle>
                <CardDescription>
                  Drag and drop to reorder pages. Click to edit page titles.
                </CardDescription>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {pages.length} pages
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {pages.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No pages yet</h3>
                <p className="text-muted-foreground mb-4">Upload images to start building your magazine</p>
                <Button onClick={() => setIsBulkUploadOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Pages
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {pages.map((page, index) => (
                  <PageCard
                    key={page.id}
                    page={page}
                    index={index}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onUpdateTitle={updatePageTitle}
                    onUpdateType={updatePageType}
                    onDelete={deletePage}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Upload Pages</DialogTitle>
            <DialogDescription>
              Upload multiple images and configure them as magazine pages
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* File Input */}
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleBulkFileSelect(e.target.files)}
                className="hidden"
              />
              
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Upload Magazine Pages
              </h3>
              <p className="text-muted-foreground mb-4">
                Select multiple images to upload as magazine pages
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
            </div>

            {/* Files Preview */}
            {bulkFiles.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium">Configure Pages ({bulkFiles.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bulkFiles.map((file, index) => (
                    <BulkFileCard
                      key={index}
                      file={file}
                      index={index}
                      onUpdate={(updates) => updateBulkFile(index, updates)}
                      onRemove={() => removeBulkFile(index)}
                    />
                  ))}
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsBulkUploadOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkUpload}
                    disabled={uploading || bulkFiles.length === 0}
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload {bulkFiles.length} Pages
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Page Card Component
interface PageCardProps {
  page: MagazinePage
  index: number
  onDragStart: (page: MagazinePage, index: number) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, index: number) => void
  onUpdateTitle: (pageId: string, title: string) => void
  onUpdateType: (pageId: string, type: 'cover' | 'content' | 'back_cover') => void
  onDelete: (pageId: string) => void
}

function PageCard({ page, index, onDragStart, onDragOver, onDrop, onUpdateTitle, onUpdateType, onDelete }: PageCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(page.page_title || '')

  const handleSave = () => {
    onUpdateTitle(page.id, title)
    setIsEditing(false)
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(page, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      className="group relative bg-card rounded-lg border overflow-hidden hover:shadow-lg transition-all duration-200 cursor-move"
    >
      <div className="aspect-[3/4] relative">
        <img
          src={page.image_url}
          alt={page.page_title || `Page ${index + 1}`}
          className="w-full h-full object-cover"
        />
        
        {/* Drag Handle */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-background/90 backdrop-blur-sm rounded p-1 border">
            <GripVertical className="h-4 w-4" />
          </div>
        </div>
        
        {/* Page Number */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary">
            {index + 1}
          </Badge>
        </div>
        
        {/* Page Type */}
        <div className="absolute bottom-2 left-2">
          <Badge variant="outline" className="bg-background/90">
            {page.page_type}
          </Badge>
        </div>
        
        {/* Actions */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(page.id)}
              className="h-6 w-6 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Page Title and Type */}
      <div className="p-3 space-y-3">
        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title"
                className="text-sm"
              autoFocus
            />
            <div className="flex space-x-1">
              <Button size="sm" onClick={handleSave} className="flex-1">
                Save
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setTitle(page.page_title || '')
                  setIsEditing(false)
                }}
                  className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div 
              className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
            onClick={() => setIsEditing(true)}
          >
            {page.page_title || `Page ${index + 1}`}
          </div>
        )}
        
        {/* Page Type Selector */}
        <div>
          <Select
            value={page.page_type}
            onValueChange={(value: 'cover' | 'content' | 'back_cover') => onUpdateType(page.id, value)}
          >
            <SelectTrigger className="h-8 text-xs">
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
    </div>
  )
}

// Bulk File Card Component
interface BulkFileCardProps {
  file: BulkUploadFile
  index: number
  onUpdate: (updates: Partial<BulkUploadFile>) => void
  onRemove: () => void
}

function BulkFileCard({ file, index, onUpdate, onRemove }: BulkFileCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex space-x-4">
          <div className="flex-shrink-0">
            <img
              src={file.preview}
              alt={`Preview ${index + 1}`}
              className="w-20 h-28 object-cover rounded border"
            />
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <Label htmlFor={`title-${index}`}>Page Title</Label>
              <Input
                id={`title-${index}`}
                value={file.pageTitle}
                onChange={(e) => onUpdate({ pageTitle: e.target.value })}
                placeholder="Enter page title"
                className="text-sm"
              />
            </div>
            
            <div>
              <Label htmlFor={`type-${index}`}>Page Type</Label>
              <Select
                value={file.pageType}
                onValueChange={(value: 'cover' | 'content' | 'back_cover') => 
                  onUpdate({ pageType: value })
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
            
            <Button
              size="sm"
              variant="outline"
              onClick={onRemove}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

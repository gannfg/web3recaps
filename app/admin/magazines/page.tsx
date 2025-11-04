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
import { Plus, Edit, Trash2, Eye, Upload, BookOpen } from 'lucide-react'
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

export default function MagazineManagement() {
  const [magazines, setMagazines] = useState<Magazine[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingMagazine, setEditingMagazine] = useState<Magazine | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    issue_number: 1,
    issue_date: '',
    status: 'draft' as 'draft' | 'published' | 'archived'
  })

  useEffect(() => {
    fetchMagazines()
  }, [])

  const fetchMagazines = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/magazines?status=all')
      const data = await response.json()
      
      if (response.ok) {
        setMagazines(data.magazines || [])
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
    try {
      const response = await fetch('/api/magazines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
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
        toast.error(data.error || 'Failed to create magazine')
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
    if (!editingMagazine) return

    try {
      const response = await fetch(`/api/magazines/${editingMagazine.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
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
        toast.error(data.error || 'Failed to update magazine')
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
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Magazine Management</h1>
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
                    <CardDescription className="mt-1">
                      Issue #{magazine.issue_number} • {new Date(magazine.issue_date).toLocaleDateString()}
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
                  <div className="text-sm text-muted-foreground">
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
                      onClick={() => window.open(`/admin/magazines/${magazine.id}`, '_blank')}
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
    </div>
  )
}

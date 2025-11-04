import { useState } from 'react';
import { NewsArticleFormData, NewsCategory } from '@/lib/news-types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Switch 
} from '@/components/ui/switch';
import { 
  Plus, 
  X, 
  Image as ImageIcon, 
  Video, 
  Link as LinkIcon,
  Hash
} from 'lucide-react';
import { AdvancedRichTextEditor } from './advanced-rich-text-editor';
import { SimpleRichTextEditor } from './simple-rich-text-editor';
import { NewsMediaUpload } from './news-media-upload';

interface NewsEditorFormProps {
  formData: NewsArticleFormData;
  categories: NewsCategory[];
  onChange: (updates: Partial<NewsArticleFormData>) => void;
}

export function NewsEditorForm({ 
  formData, 
  categories, 
  onChange 
}: NewsEditorFormProps) {
  const [newTag, setNewTag] = useState('');
  const [htmlContent, setHtmlContent] = useState(formData.content || '');
  const [textContent, setTextContent] = useState('');

  // Debug content changes
  console.log('NewsEditorForm - formData.content length:', formData.content?.length || 0);
  console.log('NewsEditorForm - formData.content preview:', formData.content?.substring(0, 100) + '...');
  console.log('NewsEditorForm - formData.content full:', formData.content);
  console.log('NewsEditorForm - formData keys:', Object.keys(formData));

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      onChange({
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange({
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Article Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Enter article title..."
              className="text-lg"
            />
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt *</Label>
            <Textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => onChange({ excerpt: e.target.value })}
              placeholder="Brief description of the article..."
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => onChange({ category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Article Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <div className="relative">
              <AdvancedRichTextEditor
                key={formData.content ? `editor-${formData.content.length}` : 'editor-empty'}
                initialValue={formData.content}
                onChange={(html, text) => {
                  setHtmlContent(html);
                  setTextContent(text);
                  onChange({ content: html });
                }}
                placeholder="Write your article content here... Use the toolbar above for rich formatting."
                minHeight="500px"
                maxHeight="800px"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use the toolbar above for rich text formatting, or type markdown shortcuts like **bold**, *italic*, # headings
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Header Image */}
      <Card>
        <CardHeader>
          <CardTitle>Header Image</CardTitle>
          <CardDescription>
            Upload or set a featured image for your article
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewsMediaUpload
            onMediaUploaded={(media) => {
              onChange({ featured_image_url: media.publicUrl });
            }}
            className="w-full"
            defaultFeatured={true}
          />
          <div className="mt-4 space-y-2">
            <Label htmlFor="featured_image_alt">Image Alt Text</Label>
            <Input
              id="featured_image_alt"
              value={formData.featured_image_alt || ''}
              onChange={(e) => onChange({ featured_image_alt: e.target.value })}
              placeholder="Describe the image for accessibility"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a tag..."
            />
            <Button onClick={handleAddTag} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {tag}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEO Settings */}
      <Card>
        <CardHeader>
          <CardTitle>SEO Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Meta Title */}
          <div className="space-y-2">
            <Label htmlFor="meta_title">Meta Title</Label>
            <Input
              id="meta_title"
              value={formData.meta_title}
              onChange={(e) => onChange({ meta_title: e.target.value })}
              placeholder="SEO title (defaults to article title)"
            />
          </div>

          {/* Meta Description */}
          <div className="space-y-2">
            <Label htmlFor="meta_description">Meta Description</Label>
            <Textarea
              id="meta_description"
              value={formData.meta_description}
              onChange={(e) => onChange({ meta_description: e.target.value })}
              placeholder="SEO description (defaults to article excerpt)"
              rows={2}
            />
          </div>

          {/* Canonical URL */}
          <div className="space-y-2">
            <Label htmlFor="canonical_url">Canonical URL</Label>
            <div className="flex gap-2">
              <Input
                id="canonical_url"
                value={formData.canonical_url}
                onChange={(e) => onChange({ canonical_url: e.target.value })}
                placeholder="https://example.com/original-article"
              />
              <Button variant="outline" size="sm">
                <LinkIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


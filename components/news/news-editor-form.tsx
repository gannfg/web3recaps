import { useState, useEffect, useRef, useCallback } from 'react';
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
import { generateMetaTitle, generateMetaDescription, extractSummaryFromContent } from '@/lib/seo-utils';

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
  
  // Track if user has manually edited SEO fields
  const [metaTitleManuallyEdited, setMetaTitleManuallyEdited] = useState(false);
  const [metaDescriptionManuallyEdited, setMetaDescriptionManuallyEdited] = useState(false);
  
  // Track previous values to detect when they change externally (e.g., loading saved article)
  const prevTitleRef = useRef<string>('');
  const prevExcerptRef = useRef<string>('');
  const prevContentRef = useRef<string>('');
  
  // Debounce timer for content changes (to avoid expensive operations on every keystroke)
  const contentDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stable onChange handler to prevent unnecessary re-renders
  // Use ref to avoid dependency on onChange which might change
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  const handleChange = useCallback((updates: Partial<NewsArticleFormData>) => {
    onChangeRef.current(updates);
  }, []);
  
  // Auto-generate meta title when title changes (only if not manually edited)
  useEffect(() => {
    if (formData.title && !metaTitleManuallyEdited && formData.title !== prevTitleRef.current) {
      const newMetaTitle = generateMetaTitle(formData.title);
      if (newMetaTitle && newMetaTitle !== formData.meta_title) {
        // Use setTimeout to avoid blocking the render
        setTimeout(() => {
          handleChange({ meta_title: newMetaTitle });
        }, 0);
      }
    }
    prevTitleRef.current = formData.title;
  }, [formData.title, formData.meta_title, metaTitleManuallyEdited, handleChange]);
  
  // Auto-generate meta description when excerpt changes (immediate, but only if excerpt exists)
  useEffect(() => {
    if (formData.excerpt && !metaDescriptionManuallyEdited && formData.excerpt !== prevExcerptRef.current) {
      const newMetaDescription = generateMetaDescription(formData.excerpt);
      if (newMetaDescription && newMetaDescription !== formData.meta_description) {
        setTimeout(() => {
          handleChange({ meta_description: newMetaDescription });
        }, 0);
      }
    }
    prevExcerptRef.current = formData.excerpt || '';
  }, [formData.excerpt, formData.meta_description, metaDescriptionManuallyEdited, handleChange]);
  
  // Auto-generate meta description from content (debounced, only if excerpt is empty)
  useEffect(() => {
    // Clear existing debounce timer
    if (contentDebounceRef.current) {
      clearTimeout(contentDebounceRef.current);
    }
    
    // Only generate from content if excerpt is empty and content actually changed
    if (!formData.excerpt && formData.content && formData.content !== prevContentRef.current && !metaDescriptionManuallyEdited) {
      // Debounce expensive HTML parsing operation
      contentDebounceRef.current = setTimeout(() => {
        try {
          const newMetaDescription = extractSummaryFromContent(formData.content);
          if (newMetaDescription && newMetaDescription !== formData.meta_description) {
            handleChange({ meta_description: newMetaDescription });
          }
        } catch (error) {
          console.error('Error generating meta description from content:', error);
        }
      }, 1000); // Wait 1 second after user stops typing
    }
    
    prevContentRef.current = formData.content || '';
    
    // Cleanup
    return () => {
      if (contentDebounceRef.current) {
        clearTimeout(contentDebounceRef.current);
      }
    };
  }, [formData.content, formData.excerpt, formData.meta_description, metaDescriptionManuallyEdited, handleChange]);
  
  // Detect if SEO fields were manually edited when form data is loaded (e.g., editing existing article)
  // Only run once on mount
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      if (formData.title && formData.meta_title) {
        const autoGeneratedTitle = generateMetaTitle(formData.title);
        if (formData.meta_title !== autoGeneratedTitle) {
          setMetaTitleManuallyEdited(true);
        }
      }
      
      if (formData.meta_description) {
        const autoGeneratedDesc = formData.excerpt 
          ? generateMetaDescription(formData.excerpt)
          : formData.content 
            ? extractSummaryFromContent(formData.content)
            : '';
        
        if (autoGeneratedDesc && formData.meta_description !== autoGeneratedDesc) {
          setMetaDescriptionManuallyEdited(true);
        }
      }
      isInitialMount.current = false;
    }
  }, [formData.title, formData.meta_title, formData.meta_description, formData.excerpt, formData.content]);

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
                key="article-editor"
                initialValue={formData.content}
                onChange={(html, text) => {
                  setHtmlContent(html);
                  setTextContent(text);
                  // Use handleChange to avoid triggering SEO updates during typing
                  handleChange({ content: html });
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
              value={formData.meta_title || ''}
              onChange={(e) => {
                setMetaTitleManuallyEdited(true);
                onChange({ meta_title: e.target.value });
              }}
              onFocus={() => setMetaTitleManuallyEdited(true)}
              placeholder="SEO title (auto-generated from article title)"
            />
            <p className="text-xs text-muted-foreground">
              {formData.meta_title ? `${formData.meta_title.length} characters` : 'Auto-generated from title'}
            </p>
          </div>

          {/* Meta Description */}
          <div className="space-y-2">
            <Label htmlFor="meta_description">Meta Description</Label>
            <Textarea
              id="meta_description"
              value={formData.meta_description || ''}
              onChange={(e) => {
                setMetaDescriptionManuallyEdited(true);
                onChange({ meta_description: e.target.value });
              }}
              onFocus={() => setMetaDescriptionManuallyEdited(true)}
              placeholder="SEO description (auto-generated from excerpt or content)"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              {formData.meta_description ? `${formData.meta_description.length} characters` : 'Auto-generated from excerpt or content'}
            </p>
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


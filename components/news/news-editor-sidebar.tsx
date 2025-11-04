import { NewsArticleFormData, NewsCategory } from '@/lib/news-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Star, 
  Eye, 
  Clock, 
  FileText,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface NewsEditorSidebarProps {
  formData: NewsArticleFormData;
  categories: NewsCategory[];
  onChange: (updates: Partial<NewsArticleFormData>) => void;
}

export function NewsEditorSidebar({ 
  formData, 
  categories, 
  onChange 
}: NewsEditorSidebarProps) {
  const wordCount = formData.content.split(/\s+/).filter(word => word.length > 0).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const selectedCategory = categories.find(cat => cat.id === formData.category_id);

  return (
    <div className="space-y-6">
      {/* Publishing Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Publishing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'draft' | 'published') => onChange({ status: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.status === 'published' && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                This article will be visible to the public
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Article Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Breaking News */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-red-500" />
              <Label htmlFor="breaking">Breaking News</Label>
            </div>
            <Switch
              id="breaking"
              checked={formData.is_breaking}
              onCheckedChange={(checked) => onChange({ is_breaking: checked })}
            />
          </div>

          {/* Featured Article */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <Label htmlFor="featured">Featured Article</Label>
            </div>
            <Switch
              id="featured"
              checked={formData.is_featured}
              onCheckedChange={(checked) => onChange({ is_featured: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Article Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Article Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Word Count</span>
            <span className="font-medium">{wordCount.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Reading Time</span>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="font-medium">{readingTime} min</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tags</span>
            <span className="font-medium">{formData.tags.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Category Info */}
      {selectedCategory && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: selectedCategory.color }}
              />
              <span className="font-medium">{selectedCategory.name}</span>
            </div>
            {selectedCategory.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {selectedCategory.description}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Use **bold** for bold text</p>
            <p>• Use *italic* for italic text</p>
            <p>• Use # for headings</p>
            <p>• Use - for bullet lists</p>
            <p>• Use 1. for numbered lists</p>
          </div>
        </CardContent>
      </Card>

      {/* SEO Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            SEO Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">
              {formData.meta_title || formData.title || 'Article Title'}
            </div>
            <div className="text-xs text-green-600">
              web3indonesia.com/news/article-slug
            </div>
            <div className="text-xs text-gray-600">
              {formData.meta_description || formData.excerpt || 'Article description...'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


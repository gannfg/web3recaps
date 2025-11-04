import { NewsArticle } from '@/lib/news-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Eye, 
  Send, 
  ArrowLeft, 
  FileText,
  Clock,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface NewsEditorHeaderProps {
  article: NewsArticle | null;
  onSave: () => void;
  onPublish: () => void;
  onPreview: () => void;
  saving: boolean;
  publishing: boolean;
  previewMode: boolean;
}

export function NewsEditorHeader({
  article,
  onSave,
  onPublish,
  onPreview,
  saving,
  publishing,
  previewMode,
}: NewsEditorHeaderProps) {
  const router = useRouter();

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-lg font-semibold">
                {article ? 'Edit Article' : 'Create Article'}
              </h1>
            </div>

            {article && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {article.status === 'published' ? 'Published' : 'Draft'}
                </Badge>
                {article.published_at && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(article.published_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side - Actions */}
          <div className="flex items-center gap-2">
            {/* Auto-save indicator */}
            {saving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Saving...
              </div>
            )}

            {/* Preview Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? 'Edit' : 'Preview'}
            </Button>

            {/* Save Draft Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={saving || publishing}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>

            {/* Publish Button */}
            <Button
              size="sm"
              onClick={onPublish}
              disabled={saving || publishing}
            >
              <Send className="h-4 w-4 mr-2" />
              {publishing ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>

        {/* Status Messages */}
        {article && (
          <div className="mt-3 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-muted-foreground">
                Last saved {new Date(article.updated_at).toLocaleTimeString()}
              </span>
            </div>
            
            {article.status === 'published' && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-yellow-600">
                  Published articles are visible to the public
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


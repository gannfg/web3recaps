import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  X, 
  Check, 
  AlertCircle,
  Loader2,
  Eye,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/hooks/use-api';

interface MediaFile {
  id: string;
  fileName: string;
  publicUrl: string;
  size: number;
  type: string;
  mediaType: 'image' | 'video';
  altText: string;
  caption: string;
  isFeatured: boolean;
}

interface NewsMediaUploadProps {
  articleId?: string;
  onMediaUploaded?: (media: MediaFile) => void;
  onMediaDeleted?: (mediaId: string) => void;
  existingMedia?: MediaFile[];
  className?: string;
  defaultFeatured?: boolean;
}

export function NewsMediaUpload({ 
  articleId, 
  onMediaUploaded, 
  onMediaDeleted, 
  existingMedia = [],
  className = '',
  defaultFeatured = false
}: NewsMediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [isFeatured, setIsFeatured] = useState(defaultFeatured);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(existingMedia);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { execute } = useApi();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image or video file.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setMediaType(isImage ? 'image' : 'video');
    setAltText('');
    setCaption('');
    setIsFeatured(defaultFeatured);
  }, [toast]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mediaType', mediaType);
      formData.append('altText', altText);
      formData.append('caption', caption);
      formData.append('isFeatured', isFeatured.toString());
      if (articleId) {
        formData.append('articleId', articleId);
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await execute('/api/news/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.data) {
        const newMedia: MediaFile = {
          id: result.data.id,
          fileName: result.data.fileName,
          publicUrl: result.data.publicUrl,
          size: result.data.size,
          type: result.data.type,
          mediaType: result.data.mediaType,
          altText: result.data.altText,
          caption: result.data.caption,
          isFeatured: result.data.isFeatured,
        };

        setMediaFiles(prev => [...prev, newMedia]);
        onMediaUploaded?.(newMedia);

        toast({
          title: 'Upload successful',
          description: `${mediaType === 'image' ? 'Image' : 'Video'} uploaded successfully.`,
        });

        // Reset form
        setSelectedFile(null);
        setAltText('');
        setCaption('');
        setIsFeatured(defaultFeatured);
        setIsDialogOpen(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload file.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFile, mediaType, altText, caption, isFeatured, articleId, execute, onMediaUploaded, toast]);

  const handleDelete = useCallback(async (mediaId: string) => {
    setIsDeleting(mediaId);
    
    try {
      const result = await execute(`/api/news/upload?mediaId=${mediaId}`, {
        method: 'DELETE',
      });

      if (result.success) {
        setMediaFiles(prev => prev.filter(media => media.id !== mediaId));
        onMediaDeleted?.(mediaId);
        
        toast({
          title: 'Media deleted',
          description: 'Media file deleted successfully.',
        });
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete media file.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(null);
    }
  }, [execute, onMediaDeleted, toast]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMediaIcon = (mediaType: string) => {
    return mediaType === 'image' ? <ImageIcon className="h-4 w-4" /> : <Video className="h-4 w-4" />;
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Media Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Upload {mediaType === 'image' ? 'Image' : 'Video'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Media</DialogTitle>
                <DialogDescription>
                  Upload images or videos for your article.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* File Type Selection */}
                <div className="space-y-2">
                  <Label>Media Type</Label>
                  <Select value={mediaType} onValueChange={(value: 'image' | 'video') => setMediaType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* File Input */}
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Select File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                    className="cursor-pointer"
                  />
                </div>

                {/* File Preview */}
                {selectedFile && (
                  <div className="space-y-2">
                    <Label>Selected File</Label>
                    <div className="flex items-center gap-2 p-2 border rounded-lg">
                      {getMediaIcon(mediaType)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alt Text */}
                <div className="space-y-2">
                  <Label htmlFor="alt-text">Alt Text</Label>
                  <Input
                    id="alt-text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Describe the image for accessibility"
                  />
                </div>

                {/* Caption */}
                <div className="space-y-2">
                  <Label htmlFor="caption">Caption (Optional)</Label>
                  <Textarea
                    id="caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption for the media"
                    rows={2}
                  />
                </div>

                {/* Featured Toggle */}
                {mediaType === 'image' && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is-featured"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="is-featured">Set as featured image</Label>
                  </div>
                )}

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}

                {/* Upload Button */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className="flex-1"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Media Files List */}
          {mediaFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Uploaded Media ({mediaFiles.length})</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {mediaFiles.map((media) => (
                  <div
                    key={media.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-shrink-0">
                      {getMediaIcon(media.mediaType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {media.fileName.split('/').pop()}
                        </p>
                        {media.isFeatured && (
                          <Badge variant="secondary" className="text-xs">
                            Featured
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(media.size)} • {media.mediaType}
                      </p>
                      {media.altText && (
                        <p className="text-xs text-muted-foreground truncate">
                          Alt: {media.altText}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(media.publicUrl, '_blank')}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(media.id)}
                        disabled={isDeleting === media.id}
                        title="Delete"
                      >
                        {isDeleting === media.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

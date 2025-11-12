import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { generateArticleHTML } from '@/lib/news-html-utils';
import { useApi } from '@/hooks/use-api';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Code, 
  Link, 
  Image, 
  Video,
  Youtube,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  AlertCircle
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface SimpleRichTextEditorProps {
  initialValue?: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  className?: string;
}

export function SimpleRichTextEditor({
  initialValue = '',
  onChange,
  placeholder = 'Start writing your article...',
  minHeight = '400px',
  maxHeight = '800px',
  className = '',
}: SimpleRichTextEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [history, setHistory] = useState<string[]>([initialValue]);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [historyIndex, setHistoryIndex] = useState(0);
  const { execute } = useApi();

  useEffect(() => {
    console.log('SimpleRichTextEditor - initialValue changed:', initialValue);
    console.log('SimpleRichTextEditor - initialValue length:', initialValue?.length || 0);
    console.log('SimpleRichTextEditor - initialValue preview:', initialValue?.substring(0, 100) + '...');
    setValue(initialValue);
    setHistory([initialValue]);
    setHistoryIndex(0);
  }, [initialValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newValue);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    // Convert to HTML using our utility
    const html = convertMarkdownToHtml(newValue);
    onChange(html, newValue);
  }, [history, historyIndex, onChange]);

  const convertMarkdownToHtml = (text: string): string => {
    if (!text.trim()) return '';
    
    // Split into lines and process each line
    const lines = text.split('\n');
    const processedLines: string[] = [];
    let inList = false;
    let inOrderedList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Headings
      if (trimmedLine.match(/^#{1,6} /)) {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        processedLines.push(line.replace(/^(#{1,6}) (.*)$/, '<$1>$2</$1>'));
        continue;
      }
      
      // Blockquotes
      if (trimmedLine.startsWith('> ')) {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        processedLines.push(`<blockquote><p>${trimmedLine.substring(2)}</p></blockquote>`);
        continue;
      }
      
      // Unordered lists
      if (trimmedLine.startsWith('- ')) {
        if (!inList) {
          processedLines.push('<ul>');
          inList = true;
        }
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        processedLines.push(`<li>${trimmedLine.substring(2)}</li>`);
        continue;
      }
      
      // Ordered lists
      if (trimmedLine.match(/^\d+\. /)) {
        if (!inOrderedList) {
          processedLines.push('<ol>');
          inOrderedList = true;
        }
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        processedLines.push(`<li>${trimmedLine.replace(/^\d+\. /, '')}</li>`);
        continue;
      }
      
      // Empty lines
      if (!trimmedLine) {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        processedLines.push('<br>');
        continue;
      }
      
      // Regular paragraphs
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (inOrderedList) {
        processedLines.push('</ol>');
        inOrderedList = false;
      }
      
      // Process inline formatting
      let processedLine = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
      
      processedLines.push(`<p>${processedLine}</p>`);
    }
    
    // Close any open lists
    if (inList) {
      processedLines.push('</ul>');
    }
    if (inOrderedList) {
      processedLines.push('</ol>');
    }
    
    // Use our utility to enhance the styling
    const basicHtml = processedLines.join('');
    return generateArticleHTML({ read: () => ({ getTextContent: () => text }) } as any);
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    setValue(newText);
    onChange(convertMarkdownToHtml(newText), newText);
    
    // Focus back to textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const newValue = history[newIndex];
      setValue(newValue);
      onChange(convertMarkdownToHtml(newValue), newValue);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const newValue = history[newIndex];
      setValue(newValue);
      onChange(convertMarkdownToHtml(newValue), newValue);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <>
    <Card className={className}>
      <CardContent className="p-0">
        <div className="border rounded-lg overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
            {/* Undo/Redo */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={!canUndo}
                onClick={undo}
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!canRedo}
                onClick={redo}
              >
                <Redo className="h-4 w-4" />
              </Button>
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Text Formatting */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('**', '**')}
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('*', '*')}
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('~~', '~~')}
                title="Strikethrough"
              >
                <Strikethrough className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('`', '`')}
                title="Code"
              >
                <Code className="h-4 w-4" />
              </Button>
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Headings */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('# ')}
                title="Heading 1"
              >
                <Heading1 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('## ')}
                title="Heading 2"
              >
                <Heading2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('### ')}
                title="Heading 3"
              >
                <Heading3 className="h-4 w-4" />
              </Button>
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Lists */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('- ')}
                title="Bullet List"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('1. ')}
                title="Numbered List"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('> ')}
                title="Quote"
              >
                <Quote className="h-4 w-4" />
              </Button>
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Media */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;

                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('mediaType', 'image');
                      formData.append('altText', '');
                      formData.append('caption', '');
                      formData.append('isFeatured', 'false');

                      const result = await execute('/api/news/upload', {
                        method: 'POST',
                        body: formData,
                      });
                      
                      if (result.success && result.data) {
                        insertText(`![${file.name}](${result.data.publicUrl})`);
                      } else {
                        setErrorMessage(result.error || 'Unknown error occurred');
                        setErrorDialogOpen(true);
                      }
                    } catch (error) {
                      console.error('Upload error:', error);
                      setErrorMessage('Failed to upload image. Please try again.');
                      setErrorDialogOpen(true);
                    }
                  };
                  input.click();
                }}
                title="Upload Image"
              >
                <Image className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'video/*';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;

                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('mediaType', 'video');
                      formData.append('altText', '');
                      formData.append('caption', '');
                      formData.append('isFeatured', 'false');

                      const result = await execute('/api/news/upload', {
                        method: 'POST',
                        body: formData,
                      });
                      
                      if (result.success && result.data) {
                        // Insert as HTML5 video element instead of markdown link
                        const videoHtml = `<div style="margin: 1rem 0; text-align: center;">
                          <video 
                            controls 
                            style="max-width: 100%; height: auto; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);"
                            preload="metadata"
                          >
                            <source src="${result.data.publicUrl}" type="video/mp4">
                            <source src="${result.data.publicUrl}" type="video/webm">
                            <source src="${result.data.publicUrl}" type="video/quicktime">
                            Your browser does not support the video tag.
                            <a href="${result.data.publicUrl}" style="color: hsl(var(--primary)); text-decoration: underline;">Download video</a>
                          </video>
                          <p style="margin-top: 0.5rem; font-size: 0.875rem; color: hsl(var(--muted-foreground));">Video: ${file.name}</p>
                        </div>`;
                        insertText(videoHtml);
                      } else {
                        setErrorMessage(result.error || 'Unknown error occurred');
                        setErrorDialogOpen(true);
                      }
                    } catch (error) {
                      console.error('Upload error:', error);
                      setErrorMessage('Failed to upload video. Please try again.');
                      setErrorDialogOpen(true);
                    }
                  };
                  input.click();
                }}
                title="Upload Video"
              >
                <Video className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setYoutubeUrl("");
                  setYoutubeDialogOpen(true);
                }}
                title="Insert YouTube"
              >
                <Youtube className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const url = prompt('Enter link URL:');
                  const text = prompt('Enter link text:') || url;
                  if (url) insertText(`[${text}](${url})`);
                }}
                title="Insert Link"
              >
                <Link className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Editor */}
          <Textarea
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            className="border-0 resize-none focus:ring-0 rounded-none"
            style={{ minHeight, maxHeight }}
          />
        </div>
      </CardContent>
    </Card>

    {/* Error Dialog */}
    <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="text-left">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 shadow-lg">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <AlertDialogTitle className="text-xl font-semibold leading-tight">
                Upload failed
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {errorMessage || 'An unexpected error occurred. Please try again.'}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-end gap-2 pt-4">
          <AlertDialogAction 
            onClick={() => setErrorDialogOpen(false)}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white shadow-sm"
          >
            Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* YouTube URL Dialog */}
    <Dialog open={youtubeDialogOpen} onOpenChange={setYoutubeDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert YouTube Video</DialogTitle>
          <DialogDescription>
            Enter a YouTube video URL to embed it in your article.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const videoId = youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                if (videoId) {
                  const youtubeHtml = `<div style="margin: 1rem 0; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <iframe 
                      src="https://www.youtube.com/embed/${videoId}" 
                      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" 
                      allowfullscreen
                      title="YouTube Video"
                    ></iframe>
                  </div>`;
                  insertText(youtubeHtml);
                  setYoutubeDialogOpen(false);
                  setYoutubeUrl("");
                } else {
                  setErrorMessage('Please enter a valid YouTube URL');
                  setErrorDialogOpen(true);
                }
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setYoutubeDialogOpen(false);
              setYoutubeUrl("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              const videoId = youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
              if (videoId) {
                const youtubeHtml = `<div style="margin: 1rem 0; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                  <iframe 
                    src="https://www.youtube.com/embed/${videoId}" 
                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" 
                    allowfullscreen
                    title="YouTube Video"
                  ></iframe>
                </div>`;
                insertText(youtubeHtml);
                setYoutubeDialogOpen(false);
                setYoutubeUrl("");
              } else {
                setErrorMessage('Please enter a valid YouTube URL');
                setErrorDialogOpen(true);
              }
            }}
          >
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}

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
  Redo
} from 'lucide-react';

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
                        alert('Failed to upload image: ' + (result.error || 'Unknown error'));
                      }
                    } catch (error) {
                      console.error('Upload error:', error);
                      alert('Failed to upload image. Please try again.');
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
                        alert('Failed to upload video: ' + (result.error || 'Unknown error'));
                      }
                    } catch (error) {
                      console.error('Upload error:', error);
                      alert('Failed to upload video. Please try again.');
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
                  const url = prompt('Enter YouTube URL:');
                  if (url) {
                    // Extract video ID from YouTube URL
                    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
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
                    } else {
                      alert('Please enter a valid YouTube URL');
                    }
                  }
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
  );
}

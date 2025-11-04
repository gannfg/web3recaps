'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface FallbackTextEditorProps {
  initialValue?: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  className?: string;
}

export function FallbackTextEditor({
  initialValue = '',
  onChange,
  placeholder = 'Start writing your article...',
  minHeight = '400px',
  maxHeight = '800px',
  className = '',
}: FallbackTextEditorProps) {
  const [value, setValue] = useState(initialValue);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Convert basic markdown to HTML
    const html = convertMarkdownToHtml(newValue);
    onChange(html, newValue);
  }, [onChange]);

  // Simple markdown to HTML converter
  const convertMarkdownToHtml = (text: string): string => {
    return text
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`(.*)`/gim, '<code>$1</code>')
      .replace(/\n/gim, '<br>');
  };

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="border rounded-lg overflow-hidden">
          <div className="p-3 border-b bg-muted/30">
            <Label className="text-sm text-muted-foreground">
              Rich Text Editor (Fallback Mode)
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Supports basic markdown: **bold**, *italic*, # headings
            </p>
          </div>
          <Textarea
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            className="border-0 resize-none focus:ring-0"
            style={{ minHeight, maxHeight }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

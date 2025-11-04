'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isRangeSelection, $isTextNode } from 'lexical';
import { $isLinkNode, $createLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $getSelection, $createTextNode } from 'lexical';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Link, Unlink } from 'lucide-react';

export function FloatingLinkEditor() {
  const [editor] = useLexicalComposerContext();
  const [isLink, setIsLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  const updateLinkEditor = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const node = selection.getNodes()[0];
        const parent = node.getParent();
        if ($isLinkNode(parent)) {
          setLinkUrl(parent.getURL());
          setIsLink(true);
        } else if ($isLinkNode(node)) {
          setLinkUrl(node.getURL());
          setIsLink(true);
        } else {
          setLinkUrl('');
          setIsLink(false);
        }
      }
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      updateLinkEditor();
    });
  }, [editor, updateLinkEditor]);

  const handleLinkSubmit = () => {
    if (linkUrl !== '') {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
    }
    setIsEditMode(false);
  };

  const handleLinkEdit = () => {
    setIsEditMode(true);
  };

  const handleLinkRemove = () => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    setIsEditMode(false);
    setLinkUrl('');
  };

  if (!isLink && !isEditMode) {
    return null;
  }

  return (
    <div className="absolute z-50">
      <Card className="w-80">
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              <span className="text-sm font-medium">Edit Link</span>
            </div>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Enter URL..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLinkSubmit();
                }
                if (e.key === 'Escape') {
                  setIsEditMode(false);
                }
              }}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleLinkSubmit}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleLinkRemove}>
                <Unlink className="h-3 w-3 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

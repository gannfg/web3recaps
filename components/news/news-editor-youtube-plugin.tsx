'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createYouTubeNode, YouTubeNode } from './news-editor-youtube-node';
import { useEffect } from 'react';

export function YouTubePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([YouTubeNode])) {
      throw new Error('YouTubePlugin: YouTubeNode not registered on editor');
    }
  }, [editor]);

  return null;
}


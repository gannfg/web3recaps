'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodes, $isRangeSelection } from 'lexical';
import { $createImageNode, ImageNode } from './news-editor-image-node';
import { useEffect } from 'react';

export function ImagePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error('ImagePlugin: ImageNode not registered on editor');
    }
  }, [editor]);

  return null;
}


'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isCodeNode } from '@lexical/code';
import { $getSelection, $isRangeSelection } from 'lexical';
import { useEffect } from 'react';

export function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const node = selection.getNodes()[0];
          if ($isCodeNode(node)) {
            // Code highlighting would be implemented here
            // For now, we'll just add basic styling
            // node.getElement()?.classList.add('code-highlight');
          }
        }
      });
    });
  }, [editor]);

  return null;
}

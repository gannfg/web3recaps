'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection } from 'lexical';
import { useEffect, useState } from 'react';

interface PlaceholderProps {
  text: string;
}

export function Placeholder({ text }: PlaceholderProps) {
  const [editor] = useLexicalComposerContext();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const updateVisibility = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();
          const textContent = anchorNode.getTextContent();
          setIsVisible(textContent === '');
        }
      });
    };

    const removeUpdateListener = editor.registerUpdateListener(() => {
      updateVisibility();
    });

    updateVisibility();

    return removeUpdateListener;
  }, [editor]);

  return (
    <div
      className={`absolute top-4 left-4 text-muted-foreground pointer-events-none select-none ${
        isVisible ? 'block' : 'hidden'
      }`}
    >
      {text}
    </div>
  );
}

'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';
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
        try {
          const root = $getRoot();
          const textContent = root.getTextContent();
          setIsVisible(textContent.trim() === '');
        } catch (error) {
          // Fallback: check if editor is empty
          setIsVisible(true);
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

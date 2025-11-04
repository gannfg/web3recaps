'use client';

import { useState, useCallback, useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
// import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { MarkNode } from '@lexical/mark';
import { OverflowNode } from '@lexical/overflow';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $insertNodes, $isTextNode, $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $createParagraphNode, $createTextNode, TextNode } from 'lexical';
import { $createLinkNode } from '@lexical/link';
import { $createListNode, $createListItemNode } from '@lexical/list';
import { $createCodeNode } from '@lexical/code';
import { $createTableNode, $createTableRowNode, $createTableCellNode } from '@lexical/table';
import { generateArticleHTML } from '@/lib/news-html-utils';

// Plugin to set initial content
function InitialTextPlugin({ initialValue }: { initialValue: string }) {
  const [hasSetInitial, setHasSetInitial] = useState(false);
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (initialValue && !hasSetInitial && editor) {
      editor.update(() => {
        const root = $getRoot();
        if (root.getChildren().length === 0) {
          // Parse HTML and insert nodes
          const parser = new DOMParser();
          const dom = parser.parseFromString(initialValue, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          root.append(...nodes);
        }
        setHasSetInitial(true);
      });
    }
  }, [initialValue, hasSetInitial, editor]);

  return null;
}

import { ToolbarPlugin } from './news-editor-toolbar';
import { FloatingLinkEditor } from './news-editor-floating-link';
import { ImagePlugin } from './news-editor-image-plugin';
import { YouTubePlugin } from './news-editor-youtube-plugin';
import { CodeHighlightPlugin } from './news-editor-code-highlight';
import { Placeholder } from './news-editor-placeholder';
import { ImageNode, $createImageNode } from './news-editor-image-node';
import { YouTubeNode, $createYouTubeNode } from './news-editor-youtube-node';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Code, 
  Link, 
  Image, 
  Youtube,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Type,
  Palette,
  Highlighter
} from 'lucide-react';

interface AdvancedRichTextEditorProps {
  initialValue?: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  className?: string;
}

const theme = {
  // Base styles
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'bg-muted px-1.5 py-0.5 rounded text-sm font-mono break-words',
  },
  heading: {
    h1: 'text-4xl font-bold mb-4 mt-6 break-words whitespace-pre-wrap',
    h2: 'text-3xl font-bold mb-3 mt-5 break-words whitespace-pre-wrap',
    h3: 'text-2xl font-bold mb-2 mt-4 break-words whitespace-pre-wrap',
    h4: 'text-xl font-bold mb-2 mt-3 break-words whitespace-pre-wrap',
    h5: 'text-lg font-bold mb-1 mt-2 break-words whitespace-pre-wrap',
    h6: 'text-base font-bold mb-1 mt-2 break-words whitespace-pre-wrap',
  },
  list: {
    nested: {
      listitem: 'list-none',
    },
    ol: 'list-decimal list-inside space-y-1',
    ul: 'list-disc list-inside space-y-1',
    listitem: 'ml-4',
  },
  quote: 'border-l-4 border-muted-foreground pl-4 italic text-muted-foreground my-4',
  code: 'bg-muted p-4 rounded-lg overflow-x-auto my-4',
  codeHighlight: {
    atrule: 'text-purple-600',
    attr: 'text-blue-600',
    boolean: 'text-red-600',
    builtin: 'text-purple-600',
    cdata: 'text-gray-600',
    char: 'text-green-600',
    class: 'text-blue-600',
    'class-name': 'text-blue-600',
    comment: 'text-gray-500 italic',
    constant: 'text-red-600',
    deleted: 'text-red-600',
    doctype: 'text-gray-600',
    entity: 'text-orange-600',
    function: 'text-blue-600',
    important: 'text-red-600',
    inserted: 'text-green-600',
    keyword: 'text-purple-600',
    namespace: 'text-blue-600',
    number: 'text-red-600',
    operator: 'text-gray-600',
    prolog: 'text-gray-600',
    property: 'text-blue-600',
    punctuation: 'text-gray-600',
    regex: 'text-orange-600',
    selector: 'text-blue-600',
    string: 'text-green-600',
    symbol: 'text-red-600',
    tag: 'text-blue-600',
    url: 'text-blue-600',
    variable: 'text-red-600',
  },
  table: 'border-collapse border border-border my-4',
  tableCell: 'border border-border p-2',
  tableCellHeader: 'border border-border p-2 bg-muted font-semibold',
  link: 'text-primary underline hover:text-primary/80 break-words',
  mark: 'bg-yellow-200 dark:bg-yellow-800 px-1 rounded break-words',
  paragraph: 'break-words whitespace-pre-wrap',
};

function onError(error: Error) {
  console.error('Lexical error:', error);
  // Don't throw the error to prevent crashes
}

const initialConfig = {
  namespace: 'NewsEditor',
  theme,
  onError,
  nodes: [
    TextNode,
    HeadingNode,
    ListNode,
    ListItemNode,
    QuoteNode,
    CodeNode,
    CodeHighlightNode,
    TableNode,
    TableCellNode,
    TableRowNode,
    AutoLinkNode,
    LinkNode,
    MarkNode,
    OverflowNode,
    ImageNode,
    YouTubeNode,
  ],
  editorState: null, // Let Lexical handle initial state
};

export function AdvancedRichTextEditor({
  initialValue = '',
  onChange,
  placeholder = 'Start writing your article...',
  minHeight = '400px',
  maxHeight = '800px',
  className = '',
}: AdvancedRichTextEditorProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't reset editor key to prevent re-mounting during typing

  const handleEditorChange = useCallback((editorState: any) => {
    editorState.read(() => {
      try {
        const root = $getRoot();
        const textString = root.getTextContent();
        
        const children = root.getChildren();
        
        // Custom HTML generation that handles our custom nodes
        let htmlString = '';
        try {
          // Use our custom HTML generation that handles ImageNode
          htmlString = generateArticleHTML(editorState);
        } catch (lexicalError) {
          console.warn('Custom HTML generation failed, using fallback:', lexicalError);
          // Fallback to Lexical's built-in method
          htmlString = $generateHtmlFromNodes(editorState, null);
        }
        
        // If we still don't have HTML, use our utility
        if (!htmlString || htmlString.trim() === '') {
          htmlString = generateArticleHTML(editorState);
        }
        
        onChange(htmlString, textString);
      } catch (error) {
        console.error('Error in editor change handler:', error);
        onChange('', '');
      }
    });
  }, [onChange]);

  if (!isMounted) {
    return (
      <Card className={className}>
        <CardContent className="p-0">
          <div 
            className="w-full p-4 border rounded-lg"
            style={{ minHeight, maxHeight }}
          >
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <LexicalComposer initialConfig={initialConfig}>
          <div className="border rounded-lg overflow-hidden">
            {/* Toolbar */}
            <ToolbarPlugin />
            
            {/* Editor */}
            <div className="relative" style={{ wordWrap: 'break-word', overflowWrap: 'anywhere' }}>
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    className="min-h-[400px] max-h-[800px] overflow-y-auto p-4 focus:outline-none break-words whitespace-pre-wrap"
                    style={{ minHeight, maxHeight, wordWrap: 'break-word', overflowWrap: 'anywhere' }}
                  />
                }
                placeholder={<Placeholder text={placeholder} />}
                ErrorBoundary={LexicalErrorBoundary}
              />
              
              {/* Plugins */}
              <InitialTextPlugin initialValue={initialValue} />
              <OnChangePlugin onChange={handleEditorChange} />
              <HistoryPlugin />
              <AutoFocusPlugin />
              <LinkPlugin />
              <ListPlugin />
              <ImagePlugin />
              <YouTubePlugin />
              <CodeHighlightPlugin />
              {/* <MarkdownShortcutPlugin /> */}
              <TabIndentationPlugin />
              <FloatingLinkEditor />
            </div>
          </div>
        </LexicalComposer>
      </CardContent>
    </Card>
  );
}

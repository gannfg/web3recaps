'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, $insertNodes, $getRoot, CAN_REDO_COMMAND, CAN_UNDO_COMMAND, REDO_COMMAND, UNDO_COMMAND } from 'lexical';
import { $isHeadingNode } from '@lexical/rich-text';
import { $isListNode, ListNode } from '@lexical/list';
import { $isCodeNode } from '@lexical/code';
import { $isQuoteNode } from '@lexical/rich-text';
import { $isTableNode } from '@lexical/table';
import { $isLinkNode } from '@lexical/link';
import { $isMarkNode } from '@lexical/mark';
import { 
  $createHeadingNode, 
  $createQuoteNode
} from '@lexical/rich-text';
import { 
  $createParagraphNode, 
  $createTextNode, 
  $getNodeByKey,
  $isTextNode,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND
} from 'lexical';
import { $createLinkNode, $isAutoLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $createListNode, $createListItemNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from '@lexical/list';
import { $createCodeNode } from '@lexical/code';
import { $createTableNode, $createTableRowNode, $createTableCellNode, INSERT_TABLE_COMMAND } from '@lexical/table';
import { $createMarkNode } from '@lexical/mark';
import { $setBlocksType } from '@lexical/selection';
import { $createImageNode } from './news-editor-image-node';
import { $createYouTubeNode } from './news-editor-youtube-node';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Type,
  Palette,
  Highlighter,
  MoreHorizontal
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { useApi } from '@/hooks/use-api';

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const { execute } = useApi();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [isMark, setIsMark] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');
  const [isList, setIsList] = useState(false);

  const updateToolbar = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // Update text format
        setIsBold(selection.hasFormat('bold'));
        setIsItalic(selection.hasFormat('italic'));
        setIsUnderline(selection.hasFormat('underline'));
        setIsStrikethrough(selection.hasFormat('strikethrough'));
        setIsCode(selection.hasFormat('code'));

        // Update link
        const node = selection.getNodes()[0];
        const parent = node.getParent();
        if ($isLinkNode(parent) || $isAutoLinkNode(parent)) {
          setIsLink(true);
        } else {
          setIsLink(false);
        }

        // Update mark
        if ($isMarkNode(node)) {
          setIsMark(true);
        } else {
          setIsMark(false);
        }

        // Update block type
        const anchorNode = selection.anchor.getNode();
        const element = anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();
        const elementKey = element.getKey();
        const elementDOM = editor.getElementByKey(elementKey);

        if (elementDOM !== null) {
          if ($isHeadingNode(element)) {
            setBlockType(element.getTag());
          } else if ($isQuoteNode(element)) {
            setBlockType('quote');
          } else if ($isCodeNode(element)) {
            setBlockType('code');
          } else if ($isListNode(element)) {
            setBlockType('list');
            setIsList(true);
          } else {
            setBlockType('paragraph');
            setIsList(false);
          }
        }
      }
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      updateToolbar();
    });
  }, [editor, updateToolbar]);

  useEffect(() => {
    return editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      1,
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      1,
    );
  }, [editor]);

  const formatText = (format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatElement = (format: 'left' | 'center' | 'right' | 'justify') => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format);
  };

  const insertHeading = (headingSize: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') => {
    if (blockType !== headingSize) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(headingSize));
        }
      });
    }
  };

  const insertQuote = () => {
    if (blockType !== 'quote') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      });
    }
  };

  const insertCode = () => {
    if (blockType !== 'code') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createCodeNode());
        }
      });
    }
  };

  const insertList = (listType: 'bullet' | 'number') => {
    if (listType === 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  };

  const insertTable = () => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      columns: '3',
      rows: '3',
      includeHeaders: true,
    });
  };

  const insertImage = () => {
    // Create a file input element for image upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Upload the file using our API with proper authentication
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
          // Insert the uploaded image into the editor
          editor.update(() => {
            const imageNode = $createImageNode(result.data.publicUrl);
            console.log('Creating image node with URL:', result.data.publicUrl);
            console.log('Image node created:', imageNode);
            
            // Insert at current selection or at the end
            const selection = $getSelection();
            if (selection && $isRangeSelection(selection)) {
              // Insert at current cursor position
              $insertNodes([imageNode]);
              console.log('Image inserted at cursor position');
            } else {
              // Insert at the end of the document
              const root = $getRoot();
              root.append(imageNode);
              console.log('Image appended to root');
            }
            
            // Debug: Check if image was actually added
            const root = $getRoot();
            const children = root.getChildren();
            console.log('Root children after insertion:', children.length);
            console.log('Last child:', children[children.length - 1]);
            console.log('Image node inserted successfully');
          });
        } else {
          alert('Failed to upload image: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload image. Please try again.');
      }
    };
    input.click();
  };

  const insertVideo = () => {
    // Create a file input element for video upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Upload the file using our API with proper authentication
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
          // Insert the uploaded video into the editor
          editor.update(() => {
            const linkNode = $createLinkNode(result.data.publicUrl);
            const textNode = $createTextNode('Video: ' + file.name);
            linkNode.append(textNode);
            
            // Insert at the root level like images
            const root = $getRoot();
            root.append(linkNode);
            console.log('Video link inserted into editor');
            console.log('Video URL:', result.data.publicUrl);
            console.log('Video file type:', file.type);
          });
        } else {
          alert('Failed to upload video: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload video. Please try again.');
      }
    };
    input.click();
  };

  const insertYouTube = () => {
    const url = prompt('Enter YouTube URL:');
    if (url) {
      editor.update(() => {
        const youtubeNode = $createYouTubeNode(url);
        console.log('Creating YouTube node with URL:', url);
        console.log('YouTube node created:', youtubeNode);
        
        // Insert at the root level like images
        const root = $getRoot();
        root.append(youtubeNode);
        console.log('YouTube node inserted into editor');
      });
    }
  };

  const insertLink = () => {
    if (!isLink) {
      const url = prompt('Enter URL:');
      if (url) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
      }
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  };

  const insertMark = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const markNode = $createMarkNode();
        selection.insertNodes([markNode]);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={!canUndo}
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!canRedo}
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Text Formatting */}
      <div className="flex items-center gap-1">
        <Button
          variant={isBold ? "default" : "ghost"}
          size="sm"
          onClick={() => formatText('bold')}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={isItalic ? "default" : "ghost"}
          size="sm"
          onClick={() => formatText('italic')}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={isUnderline ? "default" : "ghost"}
          size="sm"
          onClick={() => formatText('underline')}
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          variant={isStrikethrough ? "default" : "ghost"}
          size="sm"
          onClick={() => formatText('strikethrough')}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          variant={isCode ? "default" : "ghost"}
          size="sm"
          onClick={() => formatText('code')}
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          variant={isMark ? "default" : "ghost"}
          size="sm"
          onClick={insertMark}
        >
          <Highlighter className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Block Types */}
      <div className="flex items-center gap-1">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Type className="h-4 w-4 mr-1" />
              {blockType === 'paragraph' ? 'Normal' : 
               blockType === 'h1' ? 'Heading 1' :
               blockType === 'h2' ? 'Heading 2' :
               blockType === 'h3' ? 'Heading 3' :
               blockType === 'quote' ? 'Quote' :
               blockType === 'code' ? 'Code' :
               blockType === 'list' ? 'List' : 'Normal'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => insertHeading('h1')}>
              <Heading1 className="h-4 w-4 mr-2" />
              Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertHeading('h2')}>
              <Heading2 className="h-4 w-4 mr-2" />
              Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertHeading('h3')}>
              <Heading3 className="h-4 w-4 mr-2" />
              Heading 3
            </DropdownMenuItem>
            <DropdownMenuItem onClick={insertQuote}>
              <Quote className="h-4 w-4 mr-2" />
              Quote
            </DropdownMenuItem>
            <DropdownMenuItem onClick={insertCode}>
              <Code className="h-4 w-4 mr-2" />
              Code Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={isList ? "default" : "ghost"}
          size="sm"
          onClick={() => insertList('bullet')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => insertList('number')}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Media & Links */}
      <div className="flex items-center gap-1">
        <Button
          variant={isLink ? "default" : "ghost"}
          size="sm"
          onClick={insertLink}
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={insertImage}
        >
          <Image className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={insertVideo}
          title="Upload Video"
        >
          <Video className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={insertYouTube}
          title="Insert YouTube"
        >
          <Youtube className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={insertTable}
        >
          <Table className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Alignment */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatElement('left')}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatElement('center')}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatElement('right')}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => formatElement('justify')}
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}


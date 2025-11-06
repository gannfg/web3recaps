import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $isTextNode, $isParagraphNode } from 'lexical';
import { $isHeadingNode, $isQuoteNode } from '@lexical/rich-text';
import { $isListNode, $isListItemNode } from '@lexical/list';
import { $isCodeNode } from '@lexical/code';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';

/**
 * Enhanced HTML generation for news articles that preserves all styling
 */
export function generateArticleHTML(editorState: any, editor?: any): string {
  try {
    // Always prefer Lexical's built-in HTML generation (it handles escaping properly)
    let htmlString = '';
    if (editor) {
      // Use editor instance if available - this is the preferred method
      htmlString = $generateHtmlFromNodes(editor, null);
    } else if (editorState) {
      // Try to get HTML from editorState
      try {
        // If editorState has a read method, we need to read the state first
        if (typeof editorState.read === 'function') {
          // We can't use $generateHtmlFromNodes directly with editorState
          // Fall through to manual processing
          return generateHTMLFromNodes(editorState);
        } else {
          // Try direct call (unlikely to work but worth trying)
          htmlString = $generateHtmlFromNodes(editorState, null);
        }
      } catch (e) {
        // If that fails, use manual processing
        return generateHTMLFromNodes(editorState);
      }
    }
    
    if (htmlString && htmlString.trim()) {
      // Only enhance styling, don't modify the structure
      // Lexical already properly escapes HTML entities
      return enhanceHTMLStyling(htmlString);
    }
  } catch (error) {
    console.warn('Lexical HTML generation failed, using fallback:', error);
  }

  // Fallback: Manual processing with proper formatting detection and escaping
  return generateHTMLFromNodes(editorState);
}

/**
 * Enhance HTML with proper styling for news articles
 */
function enhanceHTMLStyling(html: string): string {
  return html
    // Headings with proper styling (preserve existing text-align if present)
    .replace(/<h([1-6])([^>]*)style="([^"]*text-align:[^"]*)"([^>]*)>/g, (match, level, beforeStyle, style, afterStyle) => {
      // Keep existing style with text-align
      const baseStyles = level === '1' ? 'font-size: 2.5rem; font-weight: 700; line-height: 1.2; margin: 2rem 0 1rem 0; color: hsl(var(--foreground));' :
                        level === '2' ? 'font-size: 2rem; font-weight: 600; line-height: 1.3; margin: 1.75rem 0 0.75rem 0; color: hsl(var(--foreground));' :
                        level === '3' ? 'font-size: 1.5rem; font-weight: 600; line-height: 1.4; margin: 1.5rem 0 0.5rem 0; color: hsl(var(--foreground));' :
                        level === '4' ? 'font-size: 1.25rem; font-weight: 600; line-height: 1.4; margin: 1.25rem 0 0.5rem 0; color: hsl(var(--foreground));' :
                        level === '5' ? 'font-size: 1.125rem; font-weight: 600; line-height: 1.4; margin: 1rem 0 0.5rem 0; color: hsl(var(--foreground));' :
                        'font-size: 1rem; font-weight: 600; line-height: 1.4; margin: 1rem 0 0.5rem 0; color: hsl(var(--foreground));';
      return `<h${level}${beforeStyle}style="${style} ${baseStyles}"${afterStyle}>`;
    })
    .replace(/<h1(?![^>]*style)/g, '<h1 style="font-size: 2.5rem; font-weight: 700; line-height: 1.2; margin: 2rem 0 1rem 0; color: hsl(var(--foreground));">')
    .replace(/<h2(?![^>]*style)/g, '<h2 style="font-size: 2rem; font-weight: 600; line-height: 1.3; margin: 1.75rem 0 0.75rem 0; color: hsl(var(--foreground));">')
    .replace(/<h3(?![^>]*style)/g, '<h3 style="font-size: 1.5rem; font-weight: 600; line-height: 1.4; margin: 1.5rem 0 0.5rem 0; color: hsl(var(--foreground));">')
    .replace(/<h4(?![^>]*style)/g, '<h4 style="font-size: 1.25rem; font-weight: 600; line-height: 1.4; margin: 1.25rem 0 0.5rem 0; color: hsl(var(--foreground));">')
    .replace(/<h5(?![^>]*style)/g, '<h5 style="font-size: 1.125rem; font-weight: 600; line-height: 1.4; margin: 1rem 0 0.5rem 0; color: hsl(var(--foreground));">')
    .replace(/<h6(?![^>]*style)/g, '<h6 style="font-size: 1rem; font-weight: 600; line-height: 1.4; margin: 1rem 0 0.5rem 0; color: hsl(var(--foreground));">')
    
    // Paragraphs with proper styling (preserve existing text-align if present)
    .replace(/<p([^>]*)style="([^"]*text-align:[^"]*)"([^>]*)>/g, (match, beforeStyle, style, afterStyle) => {
      // Keep existing style with text-align and add base styles
      const baseStyles = 'margin-bottom: 1.25rem; line-height: 1.7; color: hsl(var(--foreground));';
      return `<p${beforeStyle}style="${style} ${baseStyles}"${afterStyle}>`;
    })
    .replace(/<p(?![^>]*style)/g, '<p style="margin-bottom: 1.25rem; line-height: 1.7; color: hsl(var(--foreground));">')
    
    // Text formatting
    .replace(/<strong(?![^>]*style)/g, '<strong style="font-weight: 700;">')
    .replace(/<b(?![^>]*style)/g, '<b style="font-weight: 700;">')
    .replace(/<em(?![^>]*style)/g, '<em style="font-style: italic;">')
    .replace(/<i(?![^>]*style)/g, '<i style="font-style: italic;">')
    .replace(/<u(?![^>]*style)/g, '<u style="text-decoration: underline;">')
    .replace(/<s(?![^>]*style)/g, '<s style="text-decoration: line-through;">')
    .replace(/<strike(?![^>]*style)/g, '<strike style="text-decoration: line-through;">')
    .replace(/<del(?![^>]*style)/g, '<del style="text-decoration: line-through;">')
    .replace(/<mark(?![^>]*style)/g, '<mark style="background-color: hsl(var(--highlight)); padding: 0.125rem 0.25rem; border-radius: 0.25rem;">')
    
    // Lists with proper styling
    .replace(/<ul(?![^>]*style)/g, '<ul style="margin: 1rem 0; padding-left: 1.5rem; list-style-type: disc;">')
    .replace(/<ol(?![^>]*style)/g, '<ol style="margin: 1rem 0; padding-left: 1.5rem; list-style-type: decimal;">')
    .replace(/<li(?![^>]*style)/g, '<li style="margin: 0.5rem 0; line-height: 1.6; color: hsl(var(--foreground));">')
    
    // Blockquotes
    .replace(/<blockquote(?![^>]*style)/g, '<blockquote style="border-left: 4px solid hsl(var(--border)); padding-left: 1rem; margin: 1.5rem 0; font-style: italic; color: hsl(var(--muted-foreground)); background: hsl(var(--muted) / 0.3); padding: 1rem; border-radius: 0.5rem;">')
    
    // Code blocks
    .replace(/<code(?![^>]*style)/g, '<code style="background: hsl(var(--muted)); padding: 0.125rem 0.375rem; border-radius: 0.375rem; font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace; font-size: 0.875rem; color: hsl(var(--foreground));">')
    .replace(/<pre(?![^>]*style)/g, '<pre style="background: hsl(var(--muted)); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1rem 0; font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace; font-size: 0.875rem; line-height: 1.5; color: hsl(var(--foreground));">')
    
    // Links
    .replace(/<a(?![^>]*style)/g, '<a style="color: hsl(var(--primary)); text-decoration: underline; text-underline-offset: 2px; hover:color: hsl(var(--primary) / 0.8);">')
    
    // Tables
    .replace(/<table(?![^>]*style)/g, '<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; border: 1px solid hsl(var(--border));">')
    .replace(/<th(?![^>]*style)/g, '<th style="border: 1px solid hsl(var(--border)); padding: 0.75rem; background: hsl(var(--muted)); font-weight: 600; text-align: left;">')
    .replace(/<td(?![^>]*style)/g, '<td style="border: 1px solid hsl(var(--border)); padding: 0.75rem; color: hsl(var(--foreground));">')
    
    // Images
    .replace(/<img(?![^>]*style)/g, '<img style="max-width: 100%; height: auto; margin: 1rem 0; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);"')
    
    // Horizontal rules
    .replace(/<hr(?![^>]*style)/g, '<hr style="border: none; height: 1px; background: hsl(var(--border)); margin: 2rem 0;">');
}

/**
 * Fallback HTML generation when Lexical's built-in method fails
 */
function generateHTMLFromNodes(editorState: any): string {
  let htmlString = '';
  
  try {
    editorState.read(() => {
      const root = $getRoot();
      const children = root.getChildren();
      
      htmlString = children.map(child => {
        const nodeType = child.getType();
        
        // Handle different node types with proper formatting
        if (nodeType === 'heading') {
          const level = (child as any).getTag() || 'h2';
          const text = processTextNode(child);
          const alignment = getElementAlignment(child);
          const alignmentStyle = alignment ? `text-align: ${alignment}; ` : '';
          return `<${level} style="${alignmentStyle}font-size: ${level === 'h1' ? '2.5rem' : level === 'h2' ? '2rem' : '1.5rem'}; font-weight: 600; margin: 2rem 0 1rem 0; color: hsl(var(--foreground));">${text}</${level}>`;
        }
        
        if (nodeType === 'paragraph') {
          const text = processTextNode(child);
          const alignment = getElementAlignment(child);
          const alignmentStyle = alignment ? `text-align: ${alignment}; ` : '';
          return `<p style="${alignmentStyle}margin-bottom: 1.25rem; line-height: 1.7; color: hsl(var(--foreground));">${text}</p>`;
        }
        
        if (nodeType === 'list') {
          const listType = (child as any).getListType() || 'bullet';
          const tag = listType === 'number' ? 'ol' : 'ul';
          const listItems = processTextNode(child);
          return `<${tag} style="margin: 1rem 0; padding-left: 1.5rem; list-style-type: ${listType === 'number' ? 'decimal' : 'disc'};">${listItems}</${tag}>`;
        }
        
        if (nodeType === 'quote') {
          const text = processTextNode(child);
          return `<blockquote style="border-left: 4px solid hsl(var(--border)); padding-left: 1rem; margin: 1.5rem 0; font-style: italic; color: hsl(var(--muted-foreground)); background: hsl(var(--muted) / 0.3); padding: 1rem; border-radius: 0.5rem;">${text}</blockquote>`;
        }
        
        if (nodeType === 'code') {
          const text = processTextNode(child);
          return `<pre style="background: hsl(var(--muted)); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1rem 0; font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace; font-size: 0.875rem; line-height: 1.5; color: hsl(var(--foreground));">${text}</pre>`;
        }
        
        if (nodeType === 'image') {
          const src = (child as any).getSrc();
          const altText = (child as any).getAltText() || '';
          return `<img src="${src}" alt="${altText}" style="max-width: 100%; height: auto; margin: 1rem 0; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);" />`;
        }
        
        if (nodeType === 'youtube') {
          const videoId = (child as any).getVideoId();
          return `<div style="margin: 1rem 0; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);"><iframe src="https://www.youtube.com/embed/${videoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe></div>`;
        }
        
        if (nodeType === 'link') {
          const url = (child as any).getURL();
          const text = processTextNode(child);
          
          // Check if this is a video link (contains video file extensions or "Video:" text)
          const isVideoLink = text.includes('Video:') || 
            /\.(mp4|webm|mov|avi|quicktime)$/i.test(url);
          
          if (isVideoLink) {
            // Create HTML5 video element for video files
            return `<div style="margin: 1rem 0; text-align: center;">
              <video 
                controls 
                style="max-width: 100%; height: auto; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);"
                preload="auto"
                playsinline
                webkit-playsinline
                muted
                src="${url}"
              >
                Your browser does not support the video tag.
                <a href="${url}" style="color: hsl(var(--primary)); text-decoration: underline;">Download video</a>
              </video>
            </div>`;
          } else {
            // Regular link
            return `<a href="${url}" style="color: hsl(var(--primary)); text-decoration: underline; text-underline-offset: 2px;" target="_blank" rel="noopener noreferrer">${text}</a>`;
          }
        }
        
        // Default: process as paragraph with formatting
        const text = processTextNode(child);
        return `<p style="margin-bottom: 1.25rem; line-height: 1.7; color: hsl(var(--foreground));">${text}</p>`;
      }).filter(html => html).join('');
    });
  } catch (error) {
    console.error('Error in fallback HTML generation:', error);
    // Ultimate fallback: wrap text in paragraph
    htmlString = `<p style="margin-bottom: 1.25rem; line-height: 1.7; color: hsl(var(--foreground));">${editorState.read(() => $getRoot().getTextContent())}</p>`;
  }
  
  return htmlString;
}

/**
 * Process text nodes to preserve formatting (bold, italic, underline, etc.)
 */
function processTextNode(node: any): string {
  // Check if node has getChildren method
  if (typeof node.getChildren !== 'function') {
    // This is likely a text node or leaf node
    return processTextFormatting(node);
  }
  
  const children = node.getChildren();
  
  if (children.length === 0) {
    // Single text node - check for formatting
    return processTextFormatting(node);
  }
  
  // Handle list items specially
  if (node.getType() === 'list') {
    return children.map((child: any) => {
      if (child.getType() === 'listitem') {
        const itemText = processTextNode(child);
        return `<li style="margin: 0.5rem 0; line-height: 1.6; color: hsl(var(--foreground));">${itemText}</li>`;
      }
      return processTextNode(child);
    }).join('');
  }
  
  // Process child nodes recursively
  return children.map((child: any) => {
    if (child.getType() === 'text') {
      return processTextFormatting(child);
    } else if (child.getType() === 'listitem') {
      return processTextNode(child);
    } else {
      return processTextNode(child);
    }
  }).join('');
}

/**
 * Escape HTML entities to prevent XSS and rendering issues
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  // Server-side fallback
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Process individual text formatting
 */
function processTextFormatting(textNode: any): string {
  let text = '';
  
  // Safely get text content
  if (typeof textNode.getTextContent === 'function') {
    text = textNode.getTextContent();
  } else if (textNode.textContent) {
    text = textNode.textContent;
  } else if (typeof textNode === 'string') {
    text = textNode;
  }
  
  if (!text) return '';
  
  // Escape HTML entities first
  const escapedText = escapeHtml(text);
  
  // Check for formatting flags safely
  const isBold = typeof textNode.hasFormat === 'function' ? textNode.hasFormat('bold') : false;
  const isItalic = typeof textNode.hasFormat === 'function' ? textNode.hasFormat('italic') : false;
  const isUnderline = typeof textNode.hasFormat === 'function' ? textNode.hasFormat('underline') : false;
  const isStrikethrough = typeof textNode.hasFormat === 'function' ? textNode.hasFormat('strikethrough') : false;
  const isCode = typeof textNode.hasFormat === 'function' ? textNode.hasFormat('code') : false;
  
  // Apply formatting tags (text is already escaped)
  if (isCode) {
    return `<code style="background: hsl(var(--muted)); padding: 0.125rem 0.375rem; border-radius: 0.375rem; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 0.875rem; color: hsl(var(--foreground));">${escapedText}</code>`;
  }
  
  if (isStrikethrough) {
    text = `<del style="text-decoration: line-through;">${escapedText}</del>`;
  } else if (isUnderline) {
    text = `<u style="text-decoration: underline;">${escapedText}</u>`;
  } else if (isItalic) {
    text = `<em style="font-style: italic;">${escapedText}</em>`;
  } else if (isBold) {
    text = `<strong style="font-weight: 700;">${escapedText}</strong>`;
  } else {
    text = escapedText;
  }
  
  // Apply nested formatting (order matters - apply inner formatting first)
  if (isBold && isItalic) {
    text = `<strong style="font-weight: 700;"><em style="font-style: italic;">${escapedText}</em></strong>`;
  } else if (isBold && isUnderline) {
    text = `<strong style="font-weight: 700;"><u style="text-decoration: underline;">${escapedText}</u></strong>`;
  } else if (isItalic && isUnderline) {
    text = `<em style="font-style: italic;"><u style="text-decoration: underline;">${escapedText}</u></em>`;
  }
  
  return text;
}

/**
 * Get element alignment from a Lexical node
 */
function getElementAlignment(node: any): string | null {
  try {
    // Try different methods to get alignment information
    if (typeof node.getFormat === 'function') {
      const format = node.getFormat();
      if (format !== undefined && format !== 0) {
        // Format is usually a number: 0=left, 1=center, 2=right, 3=justify, 4=start, 5=end
        switch (format) {
          case 1: return 'center';
          case 2: return 'right';
          case 3: return 'justify';
          case 4: return 'left'; // start alignment
          case 5: return 'right'; // end alignment
          case 0: 
          default: return null; // left is default, no need to specify
        }
      }
    }
    
    // Alternative method - check for getFormatType
    if (typeof node.getFormatType === 'function') {
      const formatType = node.getFormatType();
      if (formatType && formatType !== 'left') {
        return formatType;
      }
    }
    
    // Check for style property
    if (node.__style && node.__style.includes('text-align')) {
      const match = node.__style.match(/text-align:\s*([^;]+)/);
      if (match) {
        return match[1].trim();
      }
    }
    
    // Check for direct alignment property
    if (node.__alignment) {
      return node.__alignment;
    }
    
    // Check for format property
    if (node.__format !== undefined && node.__format !== 0) {
      switch (node.__format) {
        case 1: return 'center';
        case 2: return 'right';
        case 3: return 'justify';
        case 4: return 'left'; // start alignment
        case 5: return 'right'; // end alignment
        default: return null;
      }
    }
    
  } catch (error) {
    // Silently handle alignment detection errors
  }
  
  return null;
}

/**
 * Parse HTML content for display (used in article content component)
 */
export function parseArticleContent(html: string): string {
  if (!html || !html.includes('<')) {
    return html; // Return as-is if not HTML
  }
  
  // Ensure the HTML has proper styling
  return enhanceHTMLStyling(html);
}

'use client';

import { 
  $applyNodeReplacement, 
  DecoratorNode, 
  NodeKey, 
  SerializedLexicalNode, 
  Spread 
} from 'lexical';
import { ReactNode } from 'react';

export interface ImagePayload {
  src: string;
  altText?: string;
  key?: NodeKey;
}

export type SerializedImageNode = Spread<
  {
    src: string;
    altText?: string;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<ReactNode> {
  __src: string;
  __altText: string;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__altText, node.__key);
  }

  constructor(src: string, altText?: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText || '';
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.style.display = 'inline-block';
    div.style.margin = '8px 0';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  setSrc(src: string): void {
    const writable = this.getWritable();
    writable.__src = src;
  }

  setAltText(altText: string): void {
    const writable = this.getWritable();
    writable.__altText = altText;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  decorate(): ReactNode {
    return (
      <div className="my-4">
        <img
          src={this.__src}
          alt={this.__altText}
          className="rounded-lg object-cover w-full h-auto max-w-full"
          style={{ maxWidth: '100%', height: 'auto' }}
          onError={(e) => {
            console.error('Image failed to load:', this.__src);
            (e.target as HTMLImageElement).style.display = 'none';
          }}
          onLoad={() => {
            console.log('Image loaded successfully:', this.__src);
          }}
        />
        {this.__altText && (
          <p className="text-sm text-muted-foreground mt-2 text-center italic">
            {this.__altText}
          </p>
        )}
      </div>
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { src, altText } = serializedNode;
    const node = $createImageNode(src, altText);
    return node;
  }

  exportJSON(): SerializedImageNode {
    return {
      src: this.getSrc(),
      altText: this.getAltText(),
      type: 'image',
      version: 1,
    };
  }
}

export function $createImageNode(src: string, altText?: string): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, altText));
}

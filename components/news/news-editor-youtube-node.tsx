'use client';

import { 
  $applyNodeReplacement, 
  DecoratorNode, 
  NodeKey, 
  SerializedLexicalNode, 
  Spread 
} from 'lexical';
import { ReactNode } from 'react';

export interface YouTubePayload {
  url: string;
  key?: NodeKey;
}

export type SerializedYouTubeNode = Spread<
  {
    url: string;
  },
  SerializedLexicalNode
>;

export class YouTubeNode extends DecoratorNode<ReactNode> {
  __url: string;

  static getType(): string {
    return 'youtube';
  }

  static clone(node: YouTubeNode): YouTubeNode {
    return new YouTubeNode(node.__url, node.__key);
  }

  constructor(url: string, key?: NodeKey) {
    super(key);
    this.__url = url;
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.style.display = 'block';
    div.style.margin = '16px 0';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  setUrl(url: string): void {
    const writable = this.getWritable();
    writable.__url = url;
  }

  getUrl(): string {
    return this.__url;
  }

  getVideoId(): string {
    const url = this.__url;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : '';
  }

  decorate(): ReactNode {
    const videoId = this.getVideoId();
    
    if (!videoId) {
      return (
        <div className="my-4 p-4 border border-dashed border-muted-foreground rounded-lg text-center">
          <p className="text-muted-foreground">Invalid YouTube URL</p>
        </div>
      );
    }

    return (
      <div className="my-4">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  static importJSON(serializedNode: SerializedYouTubeNode): YouTubeNode {
    const { url } = serializedNode;
    const node = $createYouTubeNode(url);
    return node;
  }

  exportJSON(): SerializedYouTubeNode {
    return {
      url: this.getUrl(),
      type: 'youtube',
      version: 1,
    };
  }
}

export function $createYouTubeNode(url: string): YouTubeNode {
  return $applyNodeReplacement(new YouTubeNode(url));
}

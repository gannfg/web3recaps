import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { NewsEditorPageSkeleton } from '@/components/news/news-editor-page-skeleton';

// Lazy load the heavy news editor component
const NewsEditorPage = dynamic(() => import('@/components/news/news-editor-page').then(mod => ({ default: mod.NewsEditorPage })), {
  loading: () => <NewsEditorPageSkeleton />,
  ssr: false
});

export const metadata = {
  title: 'News Editor - Web3 Recap',
  description: 'Create and manage news articles for Web3 Recap.',
  robots: 'noindex, nofollow', // Don't index editor pages
};

export default function NewsEditorPageRoute() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<NewsEditorPageSkeleton />}>
        <NewsEditorPage />
      </Suspense>
    </div>
  );
}


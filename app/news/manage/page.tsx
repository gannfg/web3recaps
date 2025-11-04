import { Suspense } from 'react';
import { NewsManagementPage } from '@/components/news/news-management-page';
import { NewsManagementPageSkeleton } from '@/components/news/news-management-page-skeleton';

export const metadata = {
  title: 'Manage News - Web3 Indonesia',
  description: 'Manage news articles and content for Web3 Indonesia.',
  robots: 'noindex, nofollow', // Don't index management pages
};

export default function NewsManagementPageRoute() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<NewsManagementPageSkeleton />}>
        <NewsManagementPage />
      </Suspense>
    </div>
  );
}


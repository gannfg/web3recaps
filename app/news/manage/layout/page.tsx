import { Suspense } from 'react';
import { NewsLayoutManagePage } from '@/components/news/news-layout-manage-page';
import { NewsLayoutManagePageSkeleton } from '@/components/news/news-layout-manage-page-skeleton';

export const metadata = {
  title: 'Layout Manager - News',
  description: 'Manage article layout positions for the news front page.',
};

export default function NewsLayoutManagePageRoute() {
  return (
    <div className="w-full">
      <Suspense fallback={<NewsLayoutManagePageSkeleton />}>
        <NewsLayoutManagePage />
      </Suspense>
    </div>
  );
}

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { NewsLandingPageSkeleton } from '@/components/news/news-landing-page-skeleton';

// Lazy load the heavy news landing page
const NewsLandingPage = dynamic(() => import('@/components/news/news-landing-page').then(mod => ({ default: mod.NewsLandingPage })), {
  loading: () => <NewsLandingPageSkeleton />,
  ssr: true // Keep SSR for SEO
});

export const metadata = {
  title: 'Web3 Recap - Daily Web3 News & Insights',
  description: 'Stay updated with the latest Web3 and blockchain news and insights. Your daily source for Web3 developments and analysis.',
  keywords: ['Web3', 'Blockchain', 'Cryptocurrency', 'DeFi', 'NFT', 'News', 'Recap', 'Analysis'],
  openGraph: {
    title: 'Web3 Recap - Daily Web3 News & Insights',
    description: 'Stay updated with the latest Web3 and blockchain news and insights. Your daily source for Web3 developments and analysis.',
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <div className="w-full">
      <Suspense fallback={<NewsLandingPageSkeleton />}>
        <NewsLandingPage />
      </Suspense>
    </div>
  );
}
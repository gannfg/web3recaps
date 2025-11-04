'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export function MagazinePromotionBar() {
  return (
    <div className="text-white py-3 px-4 border-b shadow-sm" style={{ backgroundColor: '#5CA3FF' }}>
      <div className="container mx-auto flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>📖 Check out our Monthly Web3 Recap Magazine here!</span>
          <Link 
            href="/magazine" 
            className="inline-flex items-center gap-1 text-white hover:opacity-80 transition-opacity underline decoration-2 underline-offset-2 font-bold"
          >
            Read Magazine
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

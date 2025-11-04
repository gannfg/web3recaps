'use client';

import { usePathname } from 'next/navigation';
import { MagazinePromotionBar } from './magazine-promotion-bar';

export function MagazineBarWrapper() {
  const pathname = usePathname();
  
  // Only show on news page (home page with news layout)
  const showMagazineBar = pathname === '/';
  
  if (!showMagazineBar) {
    return null;
  }
  
  return <MagazinePromotionBar />;
}

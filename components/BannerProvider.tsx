'use client';

import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { Banner } from '@/lib/types';
import SimpleBanner from './SimpleBanner';

interface BannerContextType {
  banners: Banner[];
  refreshBanners: () => void;
}

const BannerContext = createContext<BannerContextType | undefined>(undefined);

export function useBanner() {
  const context = useContext(BannerContext);
  if (context === undefined) {
    throw new Error('useBanner must be used within a BannerProvider');
  }
  return context;
}

interface BannerProviderProps {
  children: React.ReactNode;
}

export default function BannerProvider({ children }: BannerProviderProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // Only show banners on the main page (not in dashboard)
  const shouldShowBanners = pathname === '/';

  const prevDataJsonRef = useRef<string>('');

  const fetchBanners = async () => {
    try {
      // Prevent caching by adding cache: 'no-store' and a cache-busting param
      const response = await fetch(`/api/banners/active?ts=${Date.now()}` , { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        // Deep-compare to avoid unnecessary state updates that can interrupt animation
        const nextJson = JSON.stringify(data.banners);
        if (nextJson !== prevDataJsonRef.current) {
          prevDataJsonRef.current = nextJson;
          setBanners(data.banners);
        }
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shouldShowBanners) {
      fetchBanners();
      // Poll periodically to reflect backend changes without full reload
      const intervalId = setInterval(fetchBanners, 15000);
      // Refresh on tab focus/visibility change
      const onFocus = () => fetchBanners();
      const onVisibility = () => { if (!document.hidden) fetchBanners(); };
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVisibility);
      return () => {
        clearInterval(intervalId);
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    } else {
      setLoading(false);
    }
  }, [shouldShowBanners]);

  const refreshBanners = () => {
    if (shouldShowBanners) {
      fetchBanners();
    }
  };

  const value = {
    banners,
    refreshBanners
  };

  return (
    <BannerContext.Provider value={value}>
      <div className="min-h-screen flex flex-col">
        {shouldShowBanners && !loading && banners.length > 0 && (
          <div className="fixed top-0 left-0 right-0 z-50">
            <SimpleBanner banners={banners} />
          </div>
        )}
        <div className={`${shouldShowBanners && !loading && banners.length > 0 ? 'pt-16' : ''}`}>
          {children}
        </div>
      </div>
    </BannerContext.Provider>
  );
}

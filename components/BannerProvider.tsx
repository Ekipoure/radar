'use client';

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
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

  const prevDataJsonRef = useRef<string>('');

  const fetchBanners = useCallback(async () => {
    try {
      // Prevent all forms of caching - critical for production builds
      // Use cache: 'no-store' and timestamp to bypass all caches
      const response = await fetch(`/api/banners/active?t=${Date.now()}&r=${Math.random()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Validate response structure
        if (data && Array.isArray(data.banners)) {
          // Deep-compare to avoid unnecessary state updates that can interrupt animation
          const nextJson = JSON.stringify(data.banners);
          if (nextJson !== prevDataJsonRef.current) {
            prevDataJsonRef.current = nextJson;
            setBanners(data.banners);
          }
        } else {
          // Invalid response structure - reset banners
          console.warn('[BannerProvider] Invalid response format. Expected { banners: [] }, got:', data);
          setBanners([]);
        }
      } else {
        // Handle HTTP errors
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`[BannerProvider] API error: ${response.status} ${response.statusText}`, errorText);
        setBanners([]);
      }
    } catch (error) {
      console.error('[BannerProvider] Error fetching banners:', error);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if pathname is definitively '/' (not null/undefined)
    // This prevents fetching during SSR or when pathname is not yet available
    if (pathname === '/') {
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
      setBanners([]); // Clear banners when not on main page
    }
  }, [pathname, fetchBanners]);

  const refreshBanners = () => {
    if (pathname === '/') {
      fetchBanners();
    }
  };

  const value = {
    banners,
    refreshBanners
  };

  // Only render banners when pathname is definitively '/' and we have banners
  const showBanners = pathname === '/' && !loading && banners.length > 0;

  return (
    <BannerContext.Provider value={value}>
      <div className="min-h-screen flex flex-col">
        {showBanners && (
          <div className="fixed top-0 left-0 right-0 z-50">
            <SimpleBanner banners={banners} />
          </div>
        )}
        <div className={`${showBanners ? 'pt-16' : ''}`}>
          {children}
        </div>
      </div>
    </BannerContext.Provider>
  );
}

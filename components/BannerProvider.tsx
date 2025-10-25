'use client';

import { useState, useEffect, createContext, useContext } from 'react';
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

  const fetchBanners = async () => {
    try {
      const response = await fetch('/api/banners/active');
      if (response.ok) {
        const data = await response.json();
        setBanners(data.banners);
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

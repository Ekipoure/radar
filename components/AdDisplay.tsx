'use client';

import { useState, useEffect } from 'react';
import { Ad } from '@/lib/types';

export default function AdDisplay() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response = await fetch('/api/ads?active_only=true');
        if (response.ok) {
          const data = await response.json();
          setAds(data.ads);
        }
      } catch (error) {
        console.error('Error fetching ads:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-32 bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="animate-pulse text-gray-500">در حال بارگذاری...</div>
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <div className="w-full h-32 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-medium">جای تبلیغ</p>
          <p className="text-xs text-gray-400">هیچ تبلیغ فعالی وجود ندارد</p>
        </div>
      </div>
    );
  }

  // Display the most recent active ad
  const activeAd = ads[0];

  return (
    <div className="w-full">
      {activeAd.link_url ? (
        <a
          href={activeAd.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <div className="relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
            <img
              src={activeAd.image_url}
              alt={activeAd.title}
              className="w-full h-32 object-cover"
              onError={(e) => {
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <div className="text-center text-white">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium">{activeAd.title}</p>
              </div>
            </div>
            
            {/* Overlay with title */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <h3 className="text-white text-sm font-medium group-hover:text-blue-200 transition-colors">
                {activeAd.title}
              </h3>
            </div>
          </div>
        </a>
      ) : (
        <div className="block group">
          <div className="relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
            <img
              src={activeAd.image_url}
              alt={activeAd.title}
              className="w-full h-32 object-cover"
              onError={(e) => {
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <div className="text-center text-white">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium">{activeAd.title}</p>
              </div>
            </div>
            
            {/* Overlay with title */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <h3 className="text-white text-sm font-medium group-hover:text-blue-200 transition-colors">
                {activeAd.title}
              </h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

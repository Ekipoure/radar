'use client';

import { useState, useEffect } from 'react';
import { Banner } from '@/lib/types';

interface AnimatedBannerProps {
  banners: Banner[];
}

export default function AnimatedBanner({ banners }: AnimatedBannerProps) {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Filter active banners
  const activeBanners = banners.filter(banner => banner.is_active);

  useEffect(() => {
    if (activeBanners.length === 0) return;

    const currentBanner = activeBanners[currentBannerIndex];
    if (!currentBanner) return;

    // Reset animation state and start new animation
    setIsAnimating(false);
    setTimeout(() => {
      setIsAnimating(true);
    }, 50);

    // Calculate animation duration based on banner speed
    const animationDuration = currentBanner.speed * 1000; // Convert to milliseconds

    // Set timeout to change to next banner when current animation completes
    const timeout = setTimeout(() => {
      if (activeBanners.length > 1) {
        // Move to next banner
        setCurrentBannerIndex((prevIndex) => 
          (prevIndex + 1) % activeBanners.length
        );
      } else {
        // If only one banner, restart the animation
        setCurrentBannerIndex(0);
      }
    }, animationDuration);

    return () => clearTimeout(timeout);
  }, [activeBanners, currentBannerIndex]);

  if (activeBanners.length === 0) {
    return null;
  }

  const currentBanner = activeBanners[currentBannerIndex];

  return (
    <div 
      className="w-full overflow-hidden relative"
      style={{
        backgroundColor: currentBanner.background_color,
        height: '60px',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <div
        className="whitespace-nowrap"
        style={{
          color: currentBanner.color,
          fontSize: `${currentBanner.font_size}px`,
          fontWeight: '600',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          animation: isAnimating ? `scroll-right ${currentBanner.speed}s linear forwards` : 'none',
          willChange: 'transform'
        }}
      >
        {currentBanner.text}
      </div>
      
      <style jsx>{`
        @keyframes scroll-right {
          0% {
            transform: translateX(-100%) translateY(-50%);
          }
          100% {
            transform: translateX(100vw) translateY(-50%);
          }
        }
      `}</style>
    </div>
  );
}

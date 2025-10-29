'use client';

import { useState, useEffect } from 'react';
import { Banner } from '@/lib/types';

interface SimpleBannerProps {
  banners: Banner[];
}

export default function SimpleBanner({ banners }: SimpleBannerProps) {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);

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
        // If only one banner, restart the animation by updating the key
        // This forces React to re-render and restart the animation
        setAnimationKey((prev) => prev + 1);
      }
    }, animationDuration);

    return () => clearTimeout(timeout);
  }, [activeBanners, currentBannerIndex]);

  // Separate effect to handle animation restart for single banner
  useEffect(() => {
    if (activeBanners.length !== 1) return;
    
    // When animationKey changes, reset to initial state first
    // This ensures the new div mounts in the correct initial position (translateX(-100%))
    setIsAnimating(false);
    
    // Use double requestAnimationFrame to ensure browser has time to render
    // the element in its initial position before starting animation
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    });
    
    return () => cancelAnimationFrame(rafId);
  }, [animationKey, activeBanners.length]);

  if (activeBanners.length === 0) {
    return null;
  }

  const currentBanner = activeBanners[currentBannerIndex];

  return (
    <div 
      style={{
        width: '100%',
        height: '60px',
        backgroundColor: currentBanner.background_color,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <div
        key={animationKey}
        style={{
          color: currentBanner.color,
          fontSize: `${currentBanner.font_size}px`,
          fontWeight: '600',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateX(-100%) translateY(-50%)',
          animation: isAnimating ? `scroll-right ${currentBanner.speed}s linear forwards` : 'none',
          willChange: 'transform',
          animationFillMode: 'forwards'
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

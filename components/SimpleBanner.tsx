'use client';

import { useState, useRef, useLayoutEffect } from 'react';
import { Banner } from '@/lib/types';

interface SimpleBannerProps {
  banners: Banner[];
}

export default function SimpleBanner({ banners }: SimpleBannerProps) {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerList = banners.filter(b => b.is_active);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [moving, setMoving] = useState(false);
  const [singleLoopCycle, setSingleLoopCycle] = useState(0);
  const pendingNext = useRef(false);

  // Reset animation state when current banner or its attributes change
  useLayoutEffect(() => {
    setReady(false);
    setMoving(false);
    pendingNext.current = false;
    // measure after render
    requestAnimationFrame(() => setReady(true));
  }, [currentBannerIndex, bannerList.length, bannerList[currentBannerIndex]?.text, bannerList[currentBannerIndex]?.speed, bannerList[currentBannerIndex]?.background_color, bannerList[currentBannerIndex]?.color, bannerList[currentBannerIndex]?.font_size, singleLoopCycle]);

  // On ready, accurately start the animation
  useLayoutEffect(() => {
    if (!ready || bannerList.length === 0) return;
    const containerEl = containerRef.current;
    const textEl = textRef.current;
    if (!containerEl || !textEl) return;
    const containerWidth = containerEl.offsetWidth;
    const textWidth = textEl.scrollWidth;
    if (!containerWidth || !textWidth) return;

    // position at off-screen left, no transition
    textEl.style.transition = 'none';
    textEl.style.transform = `translate(${-textWidth}px, -50%)`;
    // patch: force reflow
    textEl.getBoundingClientRect();
    // Now animate: move from left of container to right
    setMoving(true);
    const durationSec = Math.max(.1, (bannerList[currentBannerIndex].speed || 10));
    textEl.style.transition = `transform ${durationSec}s linear`;
    textEl.style.transform = `translate(${containerWidth}px, -50%)`;

    let handled = false;
    const triggerNext = () => {
      if (handled || pendingNext.current) return;
      handled = true;
      pendingNext.current = true;
      setMoving(false);
      setTimeout(() => {
        if (bannerList.length > 1) {
          setCurrentBannerIndex(idx => (idx + 1) % bannerList.length);
        } else {
          setSingleLoopCycle(c => c + 1);
        }
      }, 32);
    };

    function endHandler(e: TransitionEvent) {
      if (!moving) return;
      triggerNext();
    }
    const fallbackTimer = setTimeout(triggerNext, Math.ceil(durationSec * 1000) + 80);
    textEl.addEventListener('transitionend', endHandler);
    return () => {
      textEl.removeEventListener('transitionend', endHandler);
      clearTimeout(fallbackTimer);
    };
  }, [ready, currentBannerIndex, bannerList.length, bannerList[currentBannerIndex]?.speed]);

  if (bannerList.length === 0) return null;
  const banner = bannerList[currentBannerIndex];
  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: 60, backgroundColor: banner.background_color, overflow: 'hidden', position: 'relative', display: 'flex', alignItems:'center' }}>
      <div
        ref={textRef}
        style={{
          color: banner.color,
          fontSize: banner.font_size,
          fontWeight: 600,
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
          position: 'absolute',
          left: 0, top:'50%',
          transform: 'translate(-100%, -50%)',
          willChange: 'transform',
        }}
      >
        {banner.text}
      </div>
    </div>
  );
}

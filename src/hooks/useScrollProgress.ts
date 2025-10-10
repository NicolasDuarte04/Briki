'use client';

import { useEffect, useState, useCallback } from 'react';

export function useScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrolled80Percent, setHasScrolled80Percent] = useState(false);

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = documentHeight > 0 ? scrollTop / documentHeight : 0;
    
    setScrollProgress(progress);
    setHasScrolled80Percent(progress >= 0.8);
  }, []);

  useEffect(() => {
    // Initial calculation
    handleScroll();

    // Add scroll listener with throttling for better performance
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, [handleScroll]);

  return {
    scrollProgress,
    hasScrolled80Percent,
    scrollPercentage: Math.round(scrollProgress * 100)
  };
}

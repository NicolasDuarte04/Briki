'use client';

import React, { useEffect } from 'react';

export default function DevAxe(): React.ReactElement | null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV !== 'development') return;

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const axeModule = await import('@axe-core/react');
        const ReactDOM = await import('react-dom');
        const axe = axeModule.default;
        if (cancelled) return;
        // Initialize axe with a throttle to reduce noise
        axe(React, ReactDOM, 2000);
      } catch {
        // no-op: avoid throwing in dev ergonomics
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}



'use client';

import React from 'react';
import dynamic from 'next/dynamic';

export default function DevAxeClient(): React.ReactElement | null {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const DevAxe = dynamic(() => import('./DevAxe'), { ssr: false });
  return <DevAxe />;
}



'use client';

import { useEffect } from 'react';
import { trackDashboardView } from '@/lib/telemetry';
import { useUI } from '@/lib/ui/state';

// eslint-disable-next-line react/display-name
export default function DashboardViewTracker() {
  const setDashboardViewTime = useUI((s) => s.setDashboardViewTime);

  useEffect(() => {
    const now = Date.now();
    setDashboardViewTime(now);
    trackDashboardView({ timestamp: now });
  }, [setDashboardViewTime]);
  
  return null;
}

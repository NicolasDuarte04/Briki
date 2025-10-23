'use client';

import { useEffect } from 'react';
import { trackDashboardView } from '@/lib/telemetry';
import { useUI } from '@/lib/ui/state';

 
export default function DashboardViewTracker() {
  const setDashboardViewTime = useUI((s) => s.setDashboardViewTime);

  useEffect(() => {
    const now = Date.now();
    setDashboardViewTime(now);
    trackDashboardView({ timestamp: now });
  }, [setDashboardViewTime]);
  
  return null;
}

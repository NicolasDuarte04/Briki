'use client';

import { useEffect } from 'react';
import { logActivity, type ActivityAction } from '@/lib/activities';

interface ActivityLoggerProps {
  userId: string;
  orgId: string;
  entityType: string;
  entityId: string;
  action: ActivityAction;
}

export function ActivityLogger({
  userId,
  orgId,
  entityType,
  entityId,
  action,
}: ActivityLoggerProps) {
  useEffect(() => {
    logActivity({
      userId,
      orgId,
      entityType,
      entityId,
      action,
    });
  }, [userId, orgId, entityType, entityId, action]);

  return null;
}

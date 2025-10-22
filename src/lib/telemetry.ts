/**
 * Telemetry tracking for dashboard metrics
 * 
 * PR Metrics:
 * - TTQ (Time to Qualify): Time from dashboard view to first meaningful action
 * - DAR (Dashboard Action Rate): Percentage of users taking actions from dashboard
 * - RE (Renewal Engagement): User interaction with renewal items
 */

// Types for telemetry payloads
export interface DashboardViewPayload {
  timestamp?: number;
  userId?: string;
  locale?: string;
}

export interface DashboardActionFirstPayload {
  actionType: 'renewal_click' | 'client_click' | 'continue_task' | 'quick_action' | 'inbox_item';
  msFromView: number;
  timestamp?: number;
  userId?: string;
}

export interface RenewalActionPayload {
  policyId: string;
  bucket: 'urgent' | 'upcoming' | 'at_risk';
  action?: 'view' | 'click' | 'dismiss';
  timestamp?: number;
  userId?: string;
}

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined';

// Check if analytics is available (Segment, PostHog, etc.)
const hasAnalytics = isBrowser && typeof (window as any).analytics !== 'undefined';

/**
 * Track dashboard view event
 * Maps to: Initial load for TTQ baseline measurement
 * 
 * @param payload - Optional metadata about the dashboard view
 */
export function trackDashboardView(payload: DashboardViewPayload = {}) {
  const eventData = {
    event: 'Dashboard Viewed',
    timestamp: payload.timestamp || Date.now(),
    userId: payload.userId,
    locale: payload.locale,
  };

  if (!hasAnalytics) {
    console.info('[Telemetry] Dashboard View:', eventData);
    return;
  }

  try {
    (window as any).analytics?.track('Dashboard Viewed', eventData);
  } catch (error) {
    console.warn('[Telemetry] Failed to track dashboard view:', error);
  }
}

/**
 * Track first meaningful action from dashboard
 * Maps to: TTQ (Time to Qualify) - measures engagement speed
 * Maps to: DAR (Dashboard Action Rate) - tracks action conversion
 * 
 * @param payload - Action type and time from view
 */
export function trackDashboardActionFirst(payload: DashboardActionFirstPayload) {
  const eventData = {
    event: 'Dashboard First Action',
    actionType: payload.actionType,
    msFromView: payload.msFromView,
    timeToQualify: payload.msFromView, // TTQ metric
    timestamp: payload.timestamp || Date.now(),
    userId: payload.userId,
  };

  if (!hasAnalytics) {
    console.info('[Telemetry] Dashboard First Action (TTQ/DAR):', eventData);
    return;
  }

  try {
    (window as any).analytics?.track('Dashboard First Action', eventData);
  } catch (error) {
    console.warn('[Telemetry] Failed to track first action:', error);
  }
}

/**
 * Track renewal-specific interactions
 * Maps to: RE (Renewal Engagement) - measures renewal feature adoption
 * 
 * @param payload - Policy ID, urgency bucket, and action type
 */
export function trackRenewalAction(payload: RenewalActionPayload) {
  const eventData = {
    event: 'Renewal Action',
    policyId: payload.policyId,
    bucket: payload.bucket,
    action: payload.action || 'view',
    renewalEngagement: true, // RE metric flag
    timestamp: payload.timestamp || Date.now(),
    userId: payload.userId,
  };

  if (!hasAnalytics) {
    console.info('[Telemetry] Renewal Action (RE):', eventData);
    return;
  }

  try {
    (window as any).analytics?.track('Renewal Action', eventData);
  } catch (error) {
    console.warn('[Telemetry] Failed to track renewal action:', error);
  }
}

/**
 * Server-side telemetry helper (for API routes/server components)
 * Safe no-op that logs to console in development
 */
export function trackServerEvent(eventName: string, properties: Record<string, any>) {
  const eventData = {
    event: eventName,
    ...properties,
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
  };

  // In production, you might send this to a logging service
  if (process.env.NODE_ENV === 'development') {
    console.info(`[Server Telemetry] ${eventName}:`, eventData);
  } else {
    // TODO: Integrate with server-side analytics (e.g., PostHog, Mixpanel, custom logger)
    // Example: await logToAnalytics(eventData);
  }
}


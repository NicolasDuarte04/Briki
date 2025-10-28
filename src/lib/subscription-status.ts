/**
 * Subscription Status Configuration
 * 
 * Maps Stripe subscription statuses to UI configuration including:
 * - Badge variant and colors
 * - Headline and helper text
 * - CTA visibility and behavior
 * - Accessibility labels
 */

export type SubscriptionStatus = 
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export type StatusConfig = {
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  className: string;
  showCTA: boolean;
  ctaKey: string;
  severity: 'success' | 'warning' | 'error' | 'info';
};

/**
 * Status configuration mapping
 */
const statusConfig: Record<SubscriptionStatus, StatusConfig> = {
  active: {
    variant: 'default',
    className: 'bg-green-50 text-green-700 border-green-200',
    showCTA: false,
    ctaKey: '',
    severity: 'success',
  },
  trialing: {
    variant: 'default',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    showCTA: false,
    ctaKey: '',
    severity: 'info',
  },
  past_due: {
    variant: 'destructive',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    showCTA: true,
    ctaKey: 'status.pastDue.action',
    severity: 'warning',
  },
  unpaid: {
    variant: 'destructive',
    className: 'bg-red-50 text-red-700 border-red-200',
    showCTA: true,
    ctaKey: 'status.unpaid.action',
    severity: 'error',
  },
  canceled: {
    variant: 'secondary',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
    showCTA: false,
    ctaKey: '',
    severity: 'info',
  },
  incomplete: {
    variant: 'outline',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-300',
    showCTA: true,
    ctaKey: 'status.incomplete.action',
    severity: 'warning',
  },
  incomplete_expired: {
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-500 border-gray-300',
    showCTA: true,
    ctaKey: 'status.incompleteExpired.action',
    severity: 'error',
  },
  paused: {
    variant: 'outline',
    className: 'bg-blue-50 text-blue-600 border-blue-200',
    showCTA: true,
    ctaKey: 'status.paused.action',
    severity: 'info',
  },
};

/**
 * Get configuration for a subscription status
 */
export function getSubscriptionStatusConfig(
  status: string | null | undefined
): StatusConfig {
  const normalizedStatus = (status?.toLowerCase() || 'inactive') as SubscriptionStatus;
  
  if (statusConfig[normalizedStatus]) {
    return statusConfig[normalizedStatus];
  }

  // Fallback for unknown statuses
  return {
    variant: 'secondary',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
    showCTA: false,
    ctaKey: '',
    severity: 'info',
  };
}

/**
 * Check if a status requires immediate action
 */
export function requiresAction(status: string | null | undefined): boolean {
  const config = getSubscriptionStatusConfig(status);
  return config.showCTA && ['past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(status || '');
}

/**
 * Get translated status key for i18n
 */
export function getStatusTranslationKey(status: string | null | undefined): string {
  const normalizedStatus = status?.toLowerCase().replace('_expired', 'Expired').replace('_', '') || 'active';
  
  // Convert snake_case to camelCase for translation keys
  const translationMap: Record<string, string> = {
    'activedue': 'active',
    'trialing': 'trialing',
    'pastdue': 'pastDue',
    'unpaid': 'unpaid',
    'canceled': 'canceled',
    'incomplete': 'incomplete',
    'incompleteexpired': 'incompleteExpired',
    'paused': 'paused',
  };

  return translationMap[normalizedStatus] || 'active';
}


'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { 
  getSubscriptionStatusConfig, 
  getStatusTranslationKey,
  requiresAction 
} from '@/lib/subscription-status';
import type { Subscription } from '@prisma/client';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  priceId?: string;
}

interface PlanManagementProps {
  subscription: Subscription | null;
  locale: 'en' | 'es';
  plans: Plan[];
}

const planCodeMap: Record<string, string> = {
  'pro': 'pro',
  'starter': 'starter',
  'team': 'team',
  'premium': 'pro',
  'enterprise': 'team',
};

function formatDate(date: Date, locale: 'en' | 'es'): string {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function PlanManagement({ subscription, locale, plans }: PlanManagementProps): JSX.Element {
  const t = useTranslations('profile.accountSettings.billing');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  
  // Determine current plan
  const currentPlanCode = subscription?.planCode ?? 'free';
  const currentPlanId = planCodeMap[currentPlanCode] || currentPlanCode;
  
  // Get status configuration
  const status = subscription?.status || 'inactive';
  const statusConfig = getSubscriptionStatusConfig(status);
  const statusKey = getStatusTranslationKey(status);
  
  // Get translated status text
  const statusLabel = t(`status.${statusKey}.label`);
  const statusDescription = t(`status.${statusKey}.description`);
  const statusAction = statusConfig.showCTA ? t(`status.${statusKey}.action`) : null;
  
  // Check if action is required
  const needsAction = requiresAction(status);

  const handleUpgrade = async (planId: string): Promise<void> => {
    try {
      setLoadingPlan(planId);
      
      // Call the checkout API
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          isAnnual: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { sessionUrl } = await response.json();
      
      if (!sessionUrl) {
        throw new Error('No checkout URL returned from server');
      }

      // Redirect to Stripe Checkout
      window.location.href = sessionUrl;
    } catch (error) {
      console.error('Error starting checkout:', error);
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async (): Promise<void> => {
    try {
      // Create a customer portal session
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error opening customer portal:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {subscription ? (
          <>
            {/* Action Alert */}
            {needsAction && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900">{statusLabel}</p>
                  <p className="text-sm text-yellow-700 mt-1">{statusDescription}</p>
                </div>
                {statusAction && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleManageSubscription}
                    aria-label={`${statusAction}: ${statusDescription}`}
                  >
                    {statusAction}
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="text-base font-semibold text-gray-900">
                    {plans.find(p => p.id === currentPlanId)?.name || subscription.planCode}
                  </h3>
                  <Badge 
                    variant={statusConfig.variant}
                    className={cn(statusConfig.className, 'text-xs font-medium')}
                    aria-label={`Subscription status: ${statusLabel}`}
                  >
                    {statusLabel}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {plans.find(p => p.id === currentPlanId)?.description || subscription.planCode}
                </p>
                {subscription.currentPeriodEnd && (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      {subscription.cancelAtPeriodEnd ? (
                        locale === 'es' ? (
                          <>Cancela el {formatDate(subscription.currentPeriodEnd, locale)}</>
                        ) : (
                          <>Cancels on {formatDate(subscription.currentPeriodEnd, locale)}</>
                        )
                      ) : (
                        locale === 'es' ? (
                          <>Próxima facturación: {formatDate(subscription.currentPeriodEnd, locale)}</>
                        ) : (
                          <>Next billing: {formatDate(subscription.currentPeriodEnd, locale)}</>
                        )
                      )}
                    </p>
                  </div>
                )}
              </div>
              {!needsAction && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManageSubscription}
                  aria-label={t('manageSubscription')}
                >
                  {t('manageSubscription')}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {locale === 'es' ? 'Sin suscripción' : 'No Subscription'}
              </h3>
              <p className="text-sm text-gray-600">
                {locale === 'es' ? 'Elije un plan para empezar' : 'Choose a plan to get started'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Available Upgrades */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900">{t('availablePlans')}</h4>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isProPlus = plan.id === 'pro';
            const isUltra = plan.id === 'team';
            
            return (
              <div
                key={plan.id}
                className={cn(
                  "bg-white rounded-lg border p-6",
                  isCurrent ? "border-blue-200 ring-1 ring-blue-100" : "border-gray-200"
                )}
              >
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-base font-semibold text-gray-900">{plan.name}</h4>
                    {isCurrent && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded">
                        {t('currentPlanBadge')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    ${plan.price}/mo
                  </div>
                </div>
                
                {!isCurrent && (
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loadingPlan === plan.id}
                    className="w-full"
                    variant={isProPlus || isUltra ? "default" : "outline"}
                    aria-label={plan.id === 'starter' ? t('getStarted') : `${t('upgradeTo', { plan: plan.name })}`}
                  >
                    {loadingPlan === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                        {t('processing')}
                      </>
                    ) : (
                      <>
                        <ArrowUp className="w-4 h-4 mr-2" aria-hidden="true" />
                        {plan.id === 'starter' ? t('getStarted') : t('upgradeTo', { plan: plan.name })}
                      </>
                    )}
                  </Button>
                )}
                
                {isCurrent && subscription && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleManageSubscription}
                    aria-label={t('manageSubscription')}
                  >
                    {t('manageSubscription')}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">{t('usageThisMonth')}</h4>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">{t('onDemandUsage')}</span>
              <span className="text-sm font-medium text-gray-900">$0 / $0</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

export function LandingPricing() {
  const t = useTranslations('landing.pricing');

  const planKeys = ['starter', 'pro', 'enterprise'] as const;

  const getPlanFeatures = (planId: string): string[] => {
    const featureKeys: Record<string, string[]> = {
      starter: ['aiCredits', 'pdfPages', 'whatsapp', 'comparisons', 'proposals', 'support', 'workspace'],
      pro: ['aiCredits', 'pdfPages', 'whatsapp', 'comparisons', 'proposals', 'support', 'workspace', 'onboarding'],
      enterprise: ['aiCredits', 'pdfPages', 'allWorkflows', 'privateModel', 'analytics', 'support', 'sso', 'sla', 'dedicated'],
    };
    return (featureKeys[planId] || []).map(key => t(`${planId}.features.${key}`));
  };

  return (
    <section 
      id="precios"
      className="relative py-24 px-6 sm:px-8"
      aria-labelledby="pricing-heading"
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Section heading */}
        <h2 
          id="pricing-heading"
          className="text-center text-white text-4xl font-semibold mb-4"
        >
          {t('title')}
        </h2>
        
        <p className="text-center text-white/60 text-lg mb-16">
          {t('subtitle')}
        </p>
        
        {/* Pricing cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planKeys.map((planId) => {
            const isRecommended = planId === 'pro';
            const features = getPlanFeatures(planId);
            
            return (
              <div
                key={planId}
                className={`rounded-2xl bg-[#1a1a1a] border p-8 flex flex-col ${
                  isRecommended 
                    ? 'border-white/30 ring-2 ring-white/20' 
                    : 'border-white/10'
                }`}
              >
                {/* Plan header */}
                <div className="mb-6">
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    {t(`${planId}.name`)}
                  </h3>
                  <p className="text-sm text-white/60 mb-6">
                    {t(`${planId}.description`)}
                  </p>
                  
                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">
                      {planId === 'enterprise' ? t(`${planId}.price`) : `$${planId === 'starter' ? '49' : '149'}`}
                    </span>
                    {planId !== 'enterprise' && (
                      <span className="text-white/60 ml-2">
                        /{t('perMonth').split(' ')[1] || 'month'}
                      </span>
                    )}
                  </div>
                  
                  {/* CTA */}
                  <Button
                    className={`w-full rounded-full font-semibold ${
                      isRecommended
                        ? 'bg-white text-[#050505] hover:bg-white/90'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    {t(`${planId}.cta`)}
                  </Button>
                </div>
                
                {/* Features list */}
                <div className="flex-grow border-t border-white/10 pt-6">
                  <ul className="space-y-3">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-white/70">
                        <Check className="w-5 h-5 text-white/50 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

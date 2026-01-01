'use client';

import { Button } from '@/components/ui/button';
import { useSafeTranslations } from '@/hooks/useSafeTranslations';
import { Check } from 'lucide-react';

export function LandingPricing() {
  const { t } = useSafeTranslations('landing.pricing');

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for independent brokers',
      price: '$49',
      period: '/month',
      cta: 'Get Started',
      features: [
        '1 user',
        '1,000 AI credits/month',
        '500 PDF pages/month',
        'WhatsApp integration',
        'Unlimited comparisons',
        'Basic proposals',
        'Email support'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For growing teams',
      price: '$149',
      period: '/month',
      cta: 'Start trial',
      recommended: true,
      features: [
        '3 users',
        '5,000 AI credits/month',
        '2,000 PDF pages/month',
        'WhatsApp integration',
        'Unlimited comparisons',
        'Advanced proposals',
        'Priority support',
        'Shared workspace',
        'Dedicated onboarding'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Custom solution',
      price: 'Custom',
      period: '',
      cta: 'Contact sales',
      features: [
        'Unlimited users',
        'Unlimited AI credits',
        'Unlimited PDF pages',
        'All workflows',
        'Private AI model',
        'Custom analytics',
        '24/7 support',
        'Enterprise SSO',
        '99.9% SLA',
        'Dedicated team'
      ]
    }
  ];

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
          Pricing Plans
        </h2>
        
        <p className="text-center text-white/60 text-lg mb-16">
          Choose a plan that fits your needs
        </p>
        
        {/* Pricing cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl bg-[#1a1a1a] border p-8 flex flex-col ${
                plan.recommended 
                  ? 'border-white/30 ring-2 ring-white/20' 
                  : 'border-white/10'
              }`}
            >
              {/* Plan header */}
              <div className="mb-6">
                <h3 className="text-2xl font-semibold text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-sm text-white/60 mb-6">
                  {plan.description}
                </p>
                
                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-white/60 ml-2">
                      {plan.period}
                    </span>
                  )}
                </div>
                
                {/* CTA */}
                <Button
                  className={`w-full rounded-full font-semibold ${
                    plan.recommended
                      ? 'bg-white text-[#050505] hover:bg-white/90'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                  }`}
                >
                  {plan.cta}
                </Button>
              </div>
              
              {/* Features list */}
              <div className="flex-grow border-t border-white/10 pt-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-white/70">
                      <Check className="w-5 h-5 text-white/50 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

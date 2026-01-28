'use client';

import { useTranslations } from 'next-intl';

export function LandingHowItWorks() {
  const t = useTranslations('landing.howItWorks');

  const stepKeys = ['upload', 'analyze', 'propose'] as const;

  return (
    <section 
      id="how"
      className="relative py-24 px-6 sm:px-8"
      aria-labelledby="how-it-works-heading"
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Section heading */}
        <h2 
          id="how-it-works-heading"
          className="text-center text-white text-4xl font-semibold mb-16"
        >
          {t('heading')}
        </h2>
        
        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stepKeys.map((stepKey, index) => (
            <div
              key={stepKey}
              className="rounded-2xl bg-[#1a1a1a] border border-white/10 p-8"
            >
              {/* Step number */}
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white font-semibold mb-4">
                {index + 1}
              </div>
              
              {/* Step title */}
              <h3 className="text-2xl font-semibold text-white mb-2">
                {t(`steps.${stepKey}.title`)}
              </h3>
              
              {/* Bullets */}
              <ul className="space-y-2">
                {[0, 1].map((bulletIndex) => (
                  <li key={bulletIndex} className="text-sm text-white/50 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{t(`steps.${stepKey}.bullets.${bulletIndex}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

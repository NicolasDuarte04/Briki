'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const t = useTranslations('landing.faq');

  const faqKeys = ['integration', 'languages', 'security', 'trial', 'support'] as const;

  return (
    <section 
      className="relative py-24 px-6 sm:px-8"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-[800px] mx-auto">
        {/* Section heading */}
        <h2 
          id="faq-heading"
          className="text-center text-white text-4xl font-semibold mb-16"
        >
          {t('title')}
        </h2>
        
        {/* FAQ accordion */}
        <div className="space-y-4">
          {faqKeys.map((key, index) => (
            <div
              key={key}
              className="rounded-2xl bg-[#1a1a1a] border border-white/10 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                aria-expanded={openIndex === index}
              >
                <span className="text-lg font-semibold text-white pr-4">
                  {t(`items.${key}.question`)}
                </span>
                <ChevronDown 
                  className={`w-5 h-5 text-white/60 shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              {openIndex === index && (
                <div className="px-6 pb-5 text-white/70">
                  {t(`items.${key}.answer`)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}




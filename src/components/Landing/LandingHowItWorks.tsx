'use client';

import { useSafeTranslations } from '@/hooks/useSafeTranslations';

export function LandingHowItWorks() {
  const { t } = useSafeTranslations('landing.howItWorks');

  const steps = [
    {
      number: '1',
      title: 'Upload',
      description: 'PDF / WhatsApp',
      bullets: ['Policy PDF or WhatsApp chat', 'Spanish/English']
    },
    {
      number: '2',
      title: 'Analyze',
      description: 'coverages/exclusions',
      bullets: ['Extract clauses & exclusions', 'Compare carriers']
    },
    {
      number: '3',
      title: 'Propose',
      description: 'ready-to-send proposal',
      bullets: ['Client-ready proposal', 'Share by email/WhatsApp']
    }
  ];

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
          How it works
        </h2>
        
        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className="rounded-2xl bg-[#1a1a1a] border border-white/10 p-8"
            >
              {/* Step number */}
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white font-semibold mb-4">
                {step.number}
              </div>
              
              {/* Step title */}
              <h3 className="text-2xl font-semibold text-white mb-2">
                {step.title}
              </h3>
              
              {/* Step description */}
              <p className="text-white/60 mb-4">
                {step.description}
              </p>
              
              {/* Bullets */}
              <ul className="space-y-2">
                {step.bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex} className="text-sm text-white/50 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{bullet}</span>
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

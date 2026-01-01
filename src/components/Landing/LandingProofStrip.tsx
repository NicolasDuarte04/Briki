'use client';

import { useSafeTranslations } from '@/hooks/useSafeTranslations';

export function LandingProofStrip() {
  const { t } = useSafeTranslations('landing.statsGrowth');

  const metrics = [
    { value: '40+', label: 'brokers' },
    { value: '1.2k+', label: 'policies analyzed' },
    { value: '~10h/week', label: 'saved' },
    { value: 'Multi', label: 'WhatsApp + PDFs + Carriers' }
  ];

  return (
    <section 
      className="relative py-16 px-6 sm:px-8"
      aria-label="Proof metrics"
    >
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="rounded-2xl bg-[#1a1a1a] border border-white/10 p-6 text-center"
            >
              <div className="text-3xl font-semibold text-white mb-2">
                {metric.value}
              </div>
              <div className="text-sm text-white/60">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}




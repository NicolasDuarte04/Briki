'use client';

import { useSafeTranslations } from '@/hooks/useSafeTranslations';

export function LandingFeatureBlocks() {
  const { t } = useSafeTranslations('landing.featuresGrid');

  const features = [
    {
      id: 'whatsapp',
      title: 'WhatsApp Inbox',
      benefit: 'Import conversations and policy docs directly from WhatsApp.',
      align: 'left'
    },
    {
      id: 'analyzer',
      title: 'Policy Analyzer',
      benefit: 'Extract coverages, exclusions, and key terms automatically.',
      align: 'right'
    },
    {
      id: 'comparisons',
      title: 'Comparisons',
      benefit: 'Side-by-side carrier comparison with gap analysis.',
      align: 'left'
    },
    {
      id: 'proposals',
      title: 'Proposal Builder',
      benefit: 'Generate client-ready proposals in seconds.',
      align: 'right'
    }
  ];

  return (
    <section 
      id="producto"
      className="relative py-24 px-6 sm:px-8"
      aria-labelledby="features-heading"
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Section heading */}
        <h2 
          id="features-heading"
          className="text-center text-white text-4xl font-semibold mb-20"
        >
          Product-first features
        </h2>
        
        {/* Feature blocks */}
        <div className="space-y-24">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                feature.align === 'right' ? 'lg:flex-row-reverse' : ''
              }`}
            >
              {/* Text content */}
              <div className={feature.align === 'right' ? 'lg:order-2' : ''}>
                <h3 className="text-3xl font-semibold text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-lg text-white/60">
                  {feature.benefit}
                </p>
              </div>
              
              {/* Media frame placeholder */}
              <div className={feature.align === 'right' ? 'lg:order-1' : ''}>
                <div className="rounded-2xl bg-[#1a1a1a] border border-white/10 aspect-video flex items-center justify-center overflow-hidden">
                  <div className="text-white/30 text-sm font-medium px-8 text-center">
                    Product screenshot placeholder
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}




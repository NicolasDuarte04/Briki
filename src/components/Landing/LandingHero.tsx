'use client';

import { BrikiChat } from '@/components/Chat/BrikiChat';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { trackEvent } from '@/lib/analytics';

export function LandingHero() {
  const bgVariant = process.env.NEXT_PUBLIC_HERO_BG === 'concept' ? 'concept' : 'wave';
  const t = useTranslations('landing.hero');

  useEffect(() => {
    trackEvent('hero_view', { bgVariant });
  }, [bgVariant]);

  return (
    <section className="landing-hero-section relative min-h-screen flex items-center justify-center pt-20 pb-16" aria-labelledby="landing-hero-heading">
      {/* Wave background */}
      <div className={bgVariant === 'concept' ? 'landing-hero-concept' : 'landing-hero'} aria-hidden="true" />
      
      {/* Soft fades and vignette to keep wave visible but increase contrast */}
      <div className="landing-hero-fade" />
      <div className="landing-hero-vignette" />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 sm:px-8 py-20 text-center">
        <div className="space-y-8">
          <h1 id="landing-hero-heading" className="text-display-xl text-slate-50 font-bold tracking-tight px-6 text-balance font-smooth mx-auto max-w-[24ch] md:max-w-[28ch]">
            {t('heading')}
          </h1>
          <p className="text-subhead text-slate-100/90 md:text-slate-50/95 max-w-prose-narrow md:max-w-prose mx-auto px-4 font-normal text-pretty font-smooth">
            {t('subhead')}
          </p>
          <div className="mt-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-white/95 text-slate-900 border border-white/20 px-6 py-3 text-sm font-semibold shadow-md hover:opacity-90 transition-all duration-200 tracking-tight"
              aria-controls="hero-chat-input"
              aria-describedby="landing-hero-heading"
              onClick={() => {
                trackEvent('hero_cta_click');
                const el = document.getElementById('hero-chat-input') as HTMLTextAreaElement | null;
                if (el) {
                  el.focus();
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            >
              {t('primaryCta')}
            </button>
          </div>
          <BrikiChat mode="landing" />
        </div>
      </div>
      
      {/* Navigation sentinel */}
      <div id="nav-sentinel" className="absolute bottom-0 left-0 right-0 h-1" aria-hidden="true" />
    </section>
  );
}


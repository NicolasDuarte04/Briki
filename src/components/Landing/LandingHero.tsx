'use client';

import { LandingChatInput } from '@/components/Landing/LandingChatInput';
import { useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { trackEvent } from '@/lib/analytics';
import { pathForAgent } from '@/lib/routes/workspace';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function LandingHero() {
  const bgVariant = process.env.NEXT_PUBLIC_HERO_BG === 'concept' ? 'concept' : 'wave';
  const t = useTranslations('landing.hero');
  const locale = useLocale();

  useEffect(() => {
    trackEvent('hero_view', { bgVariant });
  }, [bgVariant]);

  return (
    <section className="landing-hero-section relative min-h-screen flex items-center justify-center overflow-hidden pt-[60px] md:pt-[80px] lg:pt-[100px]" aria-labelledby="landing-hero-heading">
      {/* Wave background */}
      <div className={bgVariant === 'concept' ? 'landing-hero-concept' : 'landing-hero'} aria-hidden="true" />
      
      {/* Soft fades and vignette to keep wave visible but increase contrast */}
      <div className="landing-hero-fade" />
      <div className="landing-hero-vignette" />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-[1040px] mx-auto px-4 sm:px-6 md:px-8 text-center">
        <div>
          {/* Headline: Two-line lockup with controlled break */}
          <h1 
            id="landing-hero-heading" 
            className="text-center font-serif text-5xl md:text-6xl lg:text-[74px] text-white"
            style={{
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.15)'
            }}
          >
            <span className="block font-semibold">El Nuevo Estándar</span>
            <span className="block font-semibold">IA Para Brokers</span>
          </h1>
          
          {/* Spacing between headline and CTAs - responsive */}
          <div className="h-10 sm:h-12 md:h-12 lg:h-14 xl:h-14"></div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Button
              asChild
              variant="default"
              size="default"
              className="rounded-full bg-white text-slate-900 hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold h-10"
              onClick={() => {
                trackEvent('hero_cta_click', { type: 'primary' });
              }}
            >
              <Link
                href={pathForAgent(locale as 'en' | 'es')}
                aria-describedby="landing-hero-heading"
              >
                {t('primaryCta')}
              </Link>
            </Button>
            <Button
              type="button"
              size="default"
              className="rounded-full border border-white/20 bg-white/5 text-lg font-semibold text-white shadow-sm backdrop-blur-xl transition-all duration-300 hover:bg-white/10 hover:border-white/30 hover:shadow-md h-10"
              onClick={(e) => {
                console.log('Button clicked - preventing navigation');
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                trackEvent('hero_cta_click', { type: 'secondary' });
                // Smooth scroll to pricing section
                setTimeout(() => {
                  const pricingSection = document.getElementById('pricing');
                  console.log('Looking for pricing section:', pricingSection);
                  if (pricingSection) {
                    console.log('Scrolling to pricing section');
                    pricingSection.scrollIntoView({ 
                      behavior: 'smooth',
                      block: 'start'
                    });
                  } else {
                    console.error('Pricing section not found');
                  }
                }, 100);
                return false;
              }}
            >
              {t('secondaryCta')}
            </Button>
          </div>
          
          {/* Composer: narrowed for processing fluency */}
          <div className="mt-1 sm:mt-2 md:mt-2 lg:mt-3">
            <LandingChatInput />
          </div>
        </div>
      </div>
      
      {/* Navigation sentinel */}
      <div id="nav-sentinel" className="absolute bottom-0 left-0 right-0 h-1" aria-hidden="true" />
    </section>
  );
}


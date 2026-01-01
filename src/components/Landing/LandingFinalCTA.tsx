'use client';

import { Button } from '@/components/ui/button';
import { useLocale } from 'next-intl';
import { pathForLogin } from '@/lib/routes/workspace';
import Link from 'next/link';

/**
 * LandingFinalCTA - Final call-to-action section
 * 
 * Big, centered headline with primary CTA button.
 * Mirrors Cursor's "Try Cursor now" section.
 */
export function LandingFinalCTA() {
  const locale = useLocale();

  return (
    <section
      className="relative w-full py-32 px-6 sm:px-8"
      style={{ backgroundColor: 'rgba(21, 26, 30, 1)' }}
      aria-labelledby="final-cta-heading"
    >
      <div className="w-full max-w-[1200px] mx-auto text-center">
        {/* Main headline */}
        <h2
          id="final-cta-heading"
          className="mb-6"
          style={{
            fontSize: 'clamp(48px, 6vw, 72px)',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.95)',
            lineHeight: '1.1',
            letterSpacing: '-0.02em',
          }}
        >
          Try Briki now.
        </h2>

        {/* Subtext */}
        <p
          className="mb-10"
          style={{
            fontSize: '18px',
            lineHeight: '1.6',
            color: 'rgba(248, 250, 252, 0.65)',
            fontWeight: '400',
            maxWidth: '600px',
            margin: '0 auto 40px',
          }}
        >
          The easiest way for brokers to analyze policies and close faster.
        </p>

        {/* Primary CTA button */}
        <Button
          asChild
          className="rounded-full bg-white text-[#050505] hover:bg-white/90 px-8 py-3 text-base font-semibold h-auto"
        >
          <Link href={pathForLogin(locale as 'en' | 'es')}>
            Get Started →
          </Link>
        </Button>
      </div>
    </section>
  );
}


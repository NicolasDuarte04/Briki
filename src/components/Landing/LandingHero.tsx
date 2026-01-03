'use client';

import { Button } from '@/components/ui/button';
import { useLocale } from 'next-intl';
import { pathForLogin, getDashboardHome } from '@/lib/routes/workspace';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import Image from 'next/image';
import { LandingDashboardDemo } from './demos/LandingDashboardDemo';

export function LandingHero() {
  const locale = useLocale();
  const { user } = useAuth();
  
  // Redirigir a dashboard si hay sesión, o a login si no hay
  const ctaHref = user 
    ? getDashboardHome(locale as 'en' | 'es') 
    : pathForLogin(locale as 'en' | 'es');

  return (
    <section 
      className="relative min-h-screen flex flex-col px-6 sm:px-8 pt-40 pb-20"
      style={{ backgroundColor: 'rgba(21, 26, 30, 1)', color: 'rgba(245, 250, 255, 1)' }}
      aria-labelledby="hero-heading"
    >
      <div className="w-full max-w-[1400px] mx-auto">
        {/* Hero text content - left aligned */}
        <div className="mb-16">
          <h1 
            id="hero-heading"
            className="text-[#F1F5F9] mb-6"
            style={{
              fontSize: '33px',
              lineHeight: '1',
              letterSpacing: '-0.02em',
              backgroundImage: 'none',
              backgroundClip: 'unset',
              WebkitBackgroundClip: 'unset',
              color: 'rgba(255, 255, 255, 0.85)',
              fontWeight: '400',
              backgroundColor: 'unset',
              background: 'unset',
              borderColor: 'rgba(0, 0, 0, 0)',
              borderStyle: 'none',
              borderImage: 'none',
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
              gap: '0px',
              flexWrap: 'wrap'
            }}
          >
            The best way to run brokerage.
          </h1>
          
          <p 
            className="text-[#94A3B8] mb-8"
            style={{
              fontSize: 'clamp(1.125rem, 1.5vw, 1.25rem)',
              lineHeight: '1.5',
              color: 'rgba(248, 250, 252, 0.7)'
            }}
          >
            Briki automates 95% of busy work.
          </p>
          
          <Button
            asChild
            className="rounded-full bg-white text-[#050505] hover:bg-white/90 px-6 py-2 text-sm font-semibold h-auto"
          >
            <Link href={ctaHref}>
              Start Now!
            </Link>
          </Button>
        </div>
        
        {/* Dashboard container - premium demo showcase */}
        <div 
          className="relative w-full rounded-[5px] border border-[#334155]/30 p-8 sm:p-14 shadow-[0_8px_40px_rgba(0,0,0,0.24)] overflow-hidden"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', minHeight: '700px' }}
        >
          {/* Art background layer - hidden on mobile for performance */}
          <div className="absolute inset-0 pointer-events-none hidden sm:block" style={{ zIndex: 0 }}>
            <Image
              src="/landing/landscape.png"
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              style={{
                objectFit: 'cover',
                objectPosition: 'center',
                opacity: 0.95,
              }}
              aria-hidden="true"
            />
            {/* Subtle vignette overlay - minimal edge fade */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at 50% 50%, transparent 60%, rgba(21, 26, 30, 0.15) 90%, rgba(21, 26, 30, 0.3) 100%)',
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            />
          </div>

          {/* Content layer - stays above background */}
          <div className="relative w-full rounded-[10px]" style={{ zIndex: 10 }}>
            {/* Dashboard Demo - sized to show art around it */}
            <div className="w-full flex justify-center rounded-[10px]">
              <div 
                className="w-full max-w-[1100px] rounded-md border border-[#64748B]/20 shadow-[0_16px_64px_rgba(0,0,0,0.4)] overflow-hidden"
                style={{ height: '600px' }}
              >
                <LandingDashboardDemo />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

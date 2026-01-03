'use client';

import { Button } from '@/components/ui/button';
import { useSafeTranslations } from '@/hooks/useSafeTranslations';
import { useLocale } from 'next-intl';
import { pathForLogin } from '@/lib/routes/workspace';
import Link from 'next/link';

export function LandingDemo() {
  const { t } = useSafeTranslations('landing.demo');
  const locale = useLocale();

  return (
    <section 
      id="demo"
      className="relative py-24 px-6 sm:px-8"
      aria-labelledby="demo-heading"
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Section heading */}
        <h2 
          id="demo-heading"
          className="text-center text-white text-4xl font-semibold mb-4"
        >
          See Briki in Action
        </h2>
        
        <p className="text-center text-white/60 text-lg mb-12">
          2-min demo: from raw policy to proposal
        </p>
        
        {/* Demo video container */}
        <div className="rounded-2xl bg-[#1a1a1a] border border-white/10 overflow-hidden mb-8">
          <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]">
            <div className="text-center px-8">
              <div className="text-white/40 text-lg font-medium mb-4">
                Demo video placeholder
              </div>
              <div className="text-white/30 text-sm">
                (Video will autoplay when added)
              </div>
            </div>
          </div>
        </div>
        
        {/* CTA */}
        <div className="flex justify-center">
          <Button
            asChild
            className="rounded-full bg-white text-[#050505] hover:bg-white/90 px-8 py-6 text-base font-semibold h-auto"
          >
            <Link href={pathForLogin(locale as 'en' | 'es')}>
              Try it yourself
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

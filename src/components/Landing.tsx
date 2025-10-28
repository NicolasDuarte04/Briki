'use client';

import { LandingNavigation } from './Landing/LandingNavigation';
import { LandingHero } from './Landing/LandingHero';
import { LandingHowItWorks } from './Landing/LandingHowItWorks';
import { LandingFeaturesGrid } from './Landing/LandingFeaturesGrid';
import { LandingDemo } from './Landing/LandingDemo';
import { LandingFeatures } from './Landing/LandingFeatures';
import { LandingPricing } from './Landing/LandingPricing';
import { LandingStatsGrowth } from './Landing/LandingStatsGrowth';
import { LandingCTA } from './Landing/LandingCTA';
import { LandingFooter } from './Landing/LandingFooter';
import { useScrollProgress } from '@/hooks/useScrollProgress';

export default function Landing() {
  const { hasScrolled80Percent } = useScrollProgress();

  return (
    <div className={`min-h-screen landing-background-transition ${
      hasScrolled80Percent ? 'bg-white' : 'bg-transparent'
    }`}>
      <LandingNavigation />
      <div id="main-content">
        <LandingHero />
        <LandingHowItWorks />
        <LandingFeaturesGrid />
        <LandingDemo />
        <LandingFeatures />
        <LandingPricing />
        <LandingStatsGrowth />
        <LandingCTA />
      </div>
      <LandingFooter />
    </div>
  );
}


'use client';

import { LandingNavigation } from './Landing/LandingNavigation';
import { LandingHero } from './Landing/LandingHero';
import { LandingHowItWorks } from './Landing/LandingHowItWorks';
import { LandingFeaturesGrid } from './Landing/LandingFeaturesGrid';
import { LandingDemo } from './Landing/LandingDemo';
import { LandingFeatures } from './Landing/LandingFeatures';
import { LandingStatsGrowth } from './Landing/LandingStatsGrowth';
import { LandingSocialProof } from './Landing/LandingSocialProof';
import { LandingCTA } from './Landing/LandingCTA';
import { LandingFooter } from './Landing/LandingFooter';

export default function Landing() {
  return (
    <div className="min-h-screen">
      <LandingNavigation />
      <div id="main-content">
        <LandingHero />
        <LandingHowItWorks />
        <LandingFeaturesGrid />
        <LandingDemo />
        <LandingFeatures />
        <LandingStatsGrowth />
        <LandingSocialProof />
        <LandingCTA />
      </div>
      <LandingFooter />
    </div>
  );
}


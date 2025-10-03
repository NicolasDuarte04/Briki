'use client';

import { LandingNavigation } from './Landing/LandingNavigation';
import { LandingHero } from './Landing/LandingHero';
import { LandingHowItWorks } from './Landing/LandingHowItWorks';
import { LandingDemo } from './Landing/LandingDemo';
import { LandingFeatures } from './Landing/LandingFeatures';
import { LandingSocialProof } from './Landing/LandingSocialProof';
import { LandingCTA } from './Landing/LandingCTA';
import { LandingFooter } from './Landing/LandingFooter';

export default function Landing() {
  return (
    <div className="min-h-screen">
      <LandingNavigation />
      <LandingHero />
      <LandingHowItWorks />
      <LandingDemo />
      <LandingFeatures />
      <LandingSocialProof />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}


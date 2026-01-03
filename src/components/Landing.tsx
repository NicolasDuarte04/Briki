'use client';

import { LandingNavigation } from './Landing/LandingNavigation';
import { LandingHero } from './Landing/LandingHero';
import { LandingSocialProof } from './Landing/LandingSocialProof';
import { LandingFeatureTrio } from './Landing/LandingFeatureTrio';
import { LandingShowcase } from './Landing/LandingShowcase';
import { LandingDemoWide } from './Landing/LandingDemoWide';
import { LandingDemoGrid } from './Landing/LandingDemoGrid';
import { LandingChangelog } from './Landing/LandingChangelog';
import { LandingContact } from './Landing/LandingContact';
import { LandingFinalCTA } from './Landing/LandingFinalCTA';
import { LandingFooter } from './Landing/LandingFooter';

/**
 * Landing Page - Complete Cursor-inspired flow
 * 
 * Full scroll order:
 * 1. Hero
 * 2. Social proof
 * 3. Three-feature grid
 * 4. Wide demo (Briki AI Assistant / Workspace)
 * 5. Showcase (full-bleed art background + floating demo)
 * 6. Demo grid (3 cards)
 * 7. Changelog preview
 * 8. Final CTA ("Try Briki now.")
 * 9. Footer
 */
export default function Landing() {
  return (
    <div className="min-h-screen landing-scroll" style={{ overflowY: 'auto', height: '100vh', backgroundColor: 'rgba(21, 26, 30, 1)' }}>
      {/* Navigation - outside main for proper landmark structure */}
      <LandingNavigation />
      
      {/* Main content landmark */}
      <main id="main-content" role="main" aria-label="Main content">
        {/* Hero Section */}
        <LandingHero />
        
        {/* Social Proof Section */}
        <LandingSocialProof />
        
        {/* Feature Trio Section */}
        <div id="producto">
          <LandingFeatureTrio />
        </div>
        
        {/* Wide Demo Section - Alternating layouts */}
        <LandingDemoWide />
        
        {/* Showcase Section - Full-bleed art background + floating demo */}
        <LandingShowcase />
        
        {/* Demo Grid Section - 3 capability cards */}
        <LandingDemoGrid />
        
        {/* Changelog Preview Section */}
        <LandingChangelog />
        
        {/* Contact Section */}
        <div id="contact">
          <LandingContact />
        </div>
        
        {/* Final CTA Section */}
        <LandingFinalCTA />
      </main>
      
      {/* Footer - outside main for proper landmark structure */}
      <LandingFooter />
    </div>
  );
}

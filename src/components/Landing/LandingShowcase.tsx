'use client';

import Image from 'next/image';
import { LandingPolicyComparisonDemo } from './demos/LandingPolicyComparisonDemo';

/**
 * LandingShowcase - Full-bleed art background with floating demo window
 * 
 * Mimics Cursor's large showcase section:
 * - Edge-to-edge background image placeholder
 * - Centered floating demo window overlay
 * - Premium glass-like aesthetics
 */
export function LandingShowcase() {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        backgroundColor: 'rgba(21, 26, 30, 1)',
        minHeight: '90vh', // Hero-like height for showcase
      }}
      aria-labelledby="showcase-heading"
    >
      {/* Full-bleed background placeholder */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundColor: 'rgba(21, 26, 30, 1)',
        }}
        aria-hidden="true"
      >
        {/* Vignette overlay - fades edges into page background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 20%, rgba(21, 26, 30, 0.3) 60%, rgba(21, 26, 30, 0.8) 90%, rgba(21, 26, 30, 1) 100%)',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Content container */}
      <div className="relative w-full max-w-[1200px] mx-auto px-6 sm:px-8 py-32" style={{ zIndex: 10, backgroundColor: 'rgba(21, 26, 30, 1)' }}>
        {/* Floating demo window */}
        <div
          className="relative rounded-[20px] border shadow-2xl overflow-hidden"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            height: '666px',
          }}
        >
          <h2
            id="showcase-heading"
            className="sr-only"
          >
            Product Showcase
          </h2>
          
          {/* Image layer - fills container perfectly */}
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
            <Image
              src="/landing/jon-bagnato-uCtPDeM7_ZA-unsplash.jpg"
              alt="Product showcase demonstration"
              fill
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1136px"
              style={{
                objectFit: 'cover',
                objectPosition: 'center',
              }}
            />
          </div>

          {/* Content layer - Policy Comparison Demo */}
          <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
            <LandingPolicyComparisonDemo />
          </div>
        </div>
      </div>
    </section>
  );
}


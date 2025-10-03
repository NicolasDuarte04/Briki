'use client';

import { VercelV0Chat } from '@/components/ui/v0-ai-chat';
import Image from 'next/image';

export function LandingHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Wave background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/brand/wave-background.png)',
        }}
      />
      
      {/* Radial gradient scrim for text contrast */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(15, 23, 42, 0.65) 0%, rgba(15, 23, 42, 0.4) 40%, transparent 70%)',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-3xl mx-auto px-8 py-16 text-center">
        {/* Logo and Brand */}
        <div className="mb-12 flex items-center justify-center gap-6">
          <Image 
            src="/brand/briki-logo-2.png" 
            alt="Briki" 
            width={80}
            height={80}
            className="opacity-90"
            priority
          />
          <h1
            className="text-white"
            style={{
              fontSize: 'clamp(3rem, 6vw, 4.5rem)',
              lineHeight: '1',
              fontWeight: '600',
              letterSpacing: '-0.02em',
            }}
          >
            Briki
          </h1>
        </div>
        
        <p
          className="mb-12 text-white/90"
          style={{
            fontSize: '1.25rem',
            lineHeight: '1.4',
          }}
        >
          The AI insurance co-pilot. Close deals faster.
        </p>
        
        <VercelV0Chat />
      </div>
      
      {/* Navigation sentinel */}
      <div id="nav-sentinel" className="absolute bottom-0 left-0 right-0 h-1" />
    </section>
  );
}


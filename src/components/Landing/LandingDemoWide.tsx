'use client';

import Image from 'next/image';
import { MarketingLink } from './MarketingLink';
import { LandingAgentDemo } from './demos/LandingAgentDemo';
import { LandingWorkspaceDemo } from './demos/LandingWorkspaceDemo';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * LandingDemoWide - Alternating wide demo sections
 * 
 * Cursor-style composition: left text column + right canvas with centered demo window.
 * Professional, dense, and calm aesthetic.
 */
export function LandingDemoWide() {
  const t = useTranslations('landing.demoWide');
  
  const demos = [
    {
      titleKey: 'demos.agent.title' as const,
      descriptionKey: 'demos.agent.description' as const,
      learnMoreHref: '#features',
      imageSrc: '/landing/plantsabstract.png',
      imageOpacity: 0.75,
      vignetteIntensity: 'none',
      reverse: false,
      demoComponent: <LandingAgentDemo />,
    },
    {
      titleKey: 'demos.cases.title' as const,
      descriptionKey: 'demos.cases.description' as const,
      learnMoreHref: '#features',
      imageSrc: '/landing/warm.png',
      imageOpacity: 0.85,
      vignetteIntensity: 'none',
      reverse: true,
      demoComponent: <LandingWorkspaceDemo />,
    },
  ];

  return (
    <section
      className="relative w-full py-24 px-6 sm:px-8"
      style={{ 
        backgroundColor: 'rgba(21, 26, 30, 1)',
        color: 'rgba(248, 250, 252, 1)',
      }}
      aria-labelledby="demo-wide-heading"
    >
      <div className="w-full max-w-[1400px] mx-auto space-y-24">
        {demos.map((demo, index) => (
          <div key={index}>
            {/* Stage layer - wraps entire section (text + artwork + demo) */}
            <div
              className="relative rounded-[12px]"
              style={{
                backgroundColor: 'rgba(30, 35, 40, 0.4)',
                border: '0.5px solid rgba(255, 255, 255, 0.04)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 0.5px rgba(255, 255, 255, 0.02)',
                padding: '32px 40px',
              }}
            >
              <div
                className={`flex flex-col ${
                  demo.reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'
                } gap-8 lg:gap-12 items-center`}
              >
                {/* Left: Text content - compact and vertically centered */}
                <div className="w-full lg:w-[380px] flex flex-col justify-center space-y-3">
                  <h2
                    style={{
                      fontSize: '28px',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.95)',
                      lineHeight: '1.25',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {t(demo.titleKey)}
                  </h2>
                  <p
                    style={{
                      fontSize: '15px',
                      lineHeight: '1.5',
                      color: 'rgba(248, 250, 252, 0.6)',
                      fontWeight: '400',
                    }}
                  >
                    {t(demo.descriptionKey)}
                  </p>
                  {/* Warm accent learn more link */}
                  <MarketingLink 
                    href={demo.learnMoreHref}
                    className="text-sm mt-1"
                  >
                    {t('learnMore')}
                  </MarketingLink>
                </div>

                {/* Right: Canvas with centered demo window */}
                <div className="flex-1 w-full relative">
                  {/* Artwork container - sits inside stage with breathing room */}
                  <div
                    className="relative w-full rounded-[8px] overflow-hidden"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      minHeight: '560px',
                    }}
                  >
                    {/* Art background layer - muted and behind demo */}
                    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
                      <Image
                        src={demo.imageSrc}
                        alt=""
                        fill
                        loading="lazy"
                        sizes="(max-width: 1024px) 100vw, 60vw"
                        style={{
                          objectFit: 'cover',
                          objectPosition: 'center',
                          opacity: demo.imageOpacity,
                        }}
                        aria-hidden="true"
                      />
                      {/* Vignette overlay - creates depth and focus */}
                      {demo.vignetteIntensity !== 'none' && (
                        <div
                          className="absolute inset-0"
                          style={{
                            background: demo.vignetteIntensity === 'medium'
                              ? 'radial-gradient(ellipse at center, transparent 30%, rgba(21, 26, 30, 0.4) 70%, rgba(21, 26, 30, 0.8) 100%)'
                              : 'radial-gradient(ellipse at center, transparent 40%, rgba(21, 26, 30, 0.3) 80%, rgba(21, 26, 30, 0.6) 100%)',
                            pointerEvents: 'none',
                          }}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {/* Demo window - centered with tight padding */}
                    <div 
                      className="relative w-full h-full flex items-center justify-center"
                      style={{ 
                        zIndex: 10,
                        padding: '48px 40px',
                        minHeight: '560px',
                      }}
                    >
                      {demo.demoComponent ? (
                        <div className="w-full max-w-[900px] h-[500px]">
                          {demo.demoComponent}
                        </div>
                      ) : (
                        <div
                          className="w-full max-w-[900px] h-[500px] rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            border: '0.5px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '14px',
                              color: 'rgba(248, 250, 252, 0.3)',
                              fontWeight: '500',
                            }}
                          >
                            {t('placeholderText')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


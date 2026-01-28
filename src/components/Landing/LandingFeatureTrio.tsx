'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LandingMiniComparisonDemo } from './demos/LandingMiniComparisonDemo';

/**
 * PolicyUnderstandingDemo - Mini interactive PDF extraction preview
 * 
 * Shows a compact PDF → extracted terms flow with subtle hover interactions.
 * Micro UI snapshot: PDF pill + key terms table + status badge.
 */
function PolicyUnderstandingDemo() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const extractedTerms = [
    { label: 'Coverage', value: '$500,000' },
    { label: 'Exclusions', value: '3 items' },
    { label: 'Waiting period', value: '30 days' },
    { label: 'Premium', value: '$245/mo' },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-2.5">
      {/* PDF file row - small pill with icon + filename */}
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border w-fit"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'rgba(248, 250, 252, 0.35)' }}
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span
          style={{
            fontSize: '11px',
            fontWeight: '500',
            color: 'rgba(248, 250, 252, 0.55)',
            letterSpacing: '-0.01em',
          }}
        >
          Policy_vida.pdf
        </span>
      </div>

      {/* Compact key terms table - 4 rows with right-aligned values */}
      <div
        className="flex flex-col rounded-md border overflow-hidden"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.015)',
          borderColor: 'rgba(255, 255, 255, 0.06)',
        }}
      >
        {extractedTerms.map((term, index) => (
          <div
            key={index}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="transition-all duration-150"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderBottom:
                index < extractedTerms.length - 1
                  ? '1px solid rgba(255, 255, 255, 0.03)'
                  : 'none',
              backgroundColor:
                hoveredIndex === index
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'transparent',
            }}
          >
            <div className="flex items-center gap-1.5">
              {/* Subtle neutral indicator dot - only on hover */}
              <div
                style={{
                  width: '2px',
                  height: '2px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(248, 250, 252, 0.4)',
                  opacity: hoveredIndex === index ? 1 : 0,
                  transition: 'opacity 150ms',
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color:
                    hoveredIndex === index
                      ? 'rgba(248, 250, 252, 0.85)'
                      : 'rgba(248, 250, 252, 0.65)',
                  letterSpacing: '-0.01em',
                  transition: 'color 150ms',
                }}
              >
                {term.label}
              </span>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '500',
                color:
                  hoveredIndex === index
                    ? 'rgba(248, 250, 252, 0.75)'
                    : 'rgba(248, 250, 252, 0.5)',
                letterSpacing: '-0.005em',
                transition: 'color 150ms',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {term.value}
            </span>
          </div>
        ))}
      </div>

      {/* Status footer strip - subtle neutral focal point */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          style={{
            width: '3px',
            height: '3px',
            borderRadius: '50%',
            backgroundColor: 'rgba(248, 250, 252, 0.4)',
          }}
        />
        <span
          style={{
            fontSize: '10px',
            fontWeight: '500',
            color: 'rgba(248, 250, 252, 0.55)',
            letterSpacing: '-0.005em',
          }}
        >
          Key terms extracted
        </span>
      </div>
    </div>
  );
}

/**
 * ProposalOutputDemo - Mini proposal preview with export action
 * 
 * Shows a compact, shareable proposal output with clean recommendations and next steps.
 * Cursor-inspired: tight spacing, hairline borders, subtle hover interactions.
 * 
 * Style guardrails (scoped to this demo):
 * - Clamp all backgrounds to very low opacity (barely tinted)
 * - No saturated fills; use muted text + subtle borders only
 * - Reduced corner radii for professional look
 * - Thin dividers over thick borders
 * - Tight, controlled shadows
 */
function ProposalOutputDemo() {
  const [isHovered, setIsHovered] = useState(false);

  const recommendations = [
    'Plan A offers best coverage-to-cost ratio',
    'Includes critical illness rider at no extra cost',
    'Meets all client requirements with $50k savings',
  ];

  const nextSteps = [
    'Review proposal with client',
    'Submit application by Jan 15',
  ];

  return (
    <div className="w-full h-full flex flex-col gap-2.5">
      {/* Recommendation section */}
      <div
        className="rounded-md border overflow-hidden"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.015)',
          borderColor: 'rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '9px 11px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: '600',
              color: 'rgba(248, 250, 252, 0.55)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Recommendation
          </span>
        </div>

        {/* Bullet points */}
        <div style={{ padding: '10px 11px' }}>
          {recommendations.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '7px',
                marginBottom: index < recommendations.length - 1 ? '5px' : '0',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: 'rgba(248, 250, 252, 0.4)',
                  lineHeight: '1.5',
                  marginTop: '1px',
                }}
              >
                •
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '400',
                  color: 'rgba(248, 250, 252, 0.7)',
                  lineHeight: '1.5',
                  letterSpacing: '-0.005em',
                }}
              >
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Next steps section */}
      <div
        className="rounded-md border overflow-hidden"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.015)',
          borderColor: 'rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '9px 11px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: '600',
              color: 'rgba(248, 250, 252, 0.55)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Next Steps
          </span>
        </div>

        {/* Steps */}
        <div style={{ padding: '10px 11px' }}>
          {nextSteps.map((step, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '7px',
                marginBottom: index < nextSteps.length - 1 ? '5px' : '0',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '500',
                  color: 'rgba(248, 250, 252, 0.45)',
                  lineHeight: '1.5',
                }}
              >
                {index + 1}.
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '400',
                  color: 'rgba(248, 250, 252, 0.7)',
                  lineHeight: '1.5',
                  letterSpacing: '-0.005em',
                }}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer with action - quiet neutral focal point */}
      <div
        className="flex items-center justify-between px-2.5 py-2 rounded-md border"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="flex items-center gap-1.5">
          <div
            style={{
              width: '3px',
              height: '3px',
              borderRadius: '50%',
              backgroundColor: 'rgba(248, 250, 252, 0.35)',
            }}
          />
          <span
            style={{
              fontSize: '10px',
              fontWeight: '500',
              color: 'rgba(248, 250, 252, 0.45)',
              letterSpacing: '-0.005em',
            }}
          >
            Ready to share
          </span>
        </div>

        {/* Export button - quiet ghost button */}
        <button
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="transition-all duration-150"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: isHovered
              ? 'rgba(255, 255, 255, 0.04)'
              : 'transparent',
            cursor: 'pointer',
          }}
        >
          {/* Download icon */}
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: isHovered
                ? 'rgba(248, 250, 252, 0.6)'
                : 'rgba(248, 250, 252, 0.4)',
              transition: 'color 150ms',
            }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span
            style={{
              fontSize: '10px',
              fontWeight: '500',
              color: isHovered
                ? 'rgba(248, 250, 252, 0.7)'
                : 'rgba(248, 250, 252, 0.5)',
              letterSpacing: '-0.005em',
              transition: 'color 150ms',
            }}
          >
            Export PDF
          </span>
        </button>
      </div>
    </div>
  );
}

/**
 * LandingFeatureTrio - Three feature cards section
 * 
 * Cursor-grade: crisp borders, tight spacing, professional density.
 * Hairline precision with subtle shadows and refined hover states.
 */
export function LandingFeatureTrio() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const t = useTranslations('landing.featureTrio');

  const features = [
    {
      titleKey: 'features.policyUnderstanding.title' as const,
      descriptionKey: 'features.policyUnderstanding.description' as const,
      ctaKey: 'features.policyUnderstanding.cta' as const,
      demoComponent: <PolicyUnderstandingDemo />,
    },
    {
      titleKey: 'features.comparison.title' as const,
      descriptionKey: 'features.comparison.description' as const,
      ctaKey: 'features.comparison.cta' as const,
      demoComponent: <LandingMiniComparisonDemo />,
    },
    {
      titleKey: 'features.proposal.title' as const,
      descriptionKey: 'features.proposal.description' as const,
      ctaKey: 'features.proposal.cta' as const,
      demoComponent: <ProposalOutputDemo />,
    },
  ];

  return (
    <section
      className="relative w-full py-20 px-6 sm:px-8"
      style={{ backgroundColor: 'rgba(21, 26, 30, 1)' }}
      aria-labelledby="features-trio-heading"
    >
      <div className="w-full max-w-[1200px] mx-auto">
        {/* Feature cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <div
              key={index}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
              className="group rounded-lg border transition-all duration-200"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.025)',
                borderColor: hoveredCard === index 
                  ? 'rgba(255, 255, 255, 0.15)' 
                  : 'rgba(255, 255, 255, 0.08)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                boxShadow: hoveredCard === index
                  ? '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.03)'
                  : '0 1px 3px rgba(0, 0, 0, 0.1)',
                transform: hoveredCard === index ? 'translateY(-2px)' : 'translateY(0)',
              }}
            >
              {/* Card header */}
              <div>
                <h3
                  className="mb-2"
                  style={{
                    fontSize: '17px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.95)',
                    lineHeight: '1.4',
                    letterSpacing: '-0.015em',
                  }}
                >
                  {t(feature.titleKey)}
                </h3>
                <p
                  className="mb-3"
                  style={{
                    fontSize: '13px',
                    lineHeight: '1.65',
                    color: 'rgba(248, 250, 252, 0.6)',
                    fontWeight: '400',
                    letterSpacing: '-0.005em',
                  }}
                >
                  {t(feature.descriptionKey)}
                </p>
                {/* Clean white CTA link */}
                <a
                  href="#"
                  className="inline-flex items-center gap-1.5 group/cta transition-all duration-200"
                  style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'rgba(255, 255, 255, 0.75)',
                    textDecoration: 'none',
                    letterSpacing: '-0.005em',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 1)';
                    e.currentTarget.style.textDecoration = 'underline';
                    e.currentTarget.style.textUnderlineOffset = '3px';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  {t(feature.ctaKey)}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginTop: '1px' }}
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
              </div>

              {/* Demo box - inset UI surface with improved depth */}
              <div
                className="rounded-md border transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderColor: hoveredCard === index
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(255, 255, 255, 0.06)',
                  minHeight: '280px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: hoveredCard === index
                    ? 'inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.08)'
                    : 'inset 0 1px 3px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)',
                }}
              >
                {feature.demoComponent}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


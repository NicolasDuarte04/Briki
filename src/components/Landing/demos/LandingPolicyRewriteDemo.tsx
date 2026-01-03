'use client';

import { useState } from 'react';
import { useSafeTranslations } from '@/hooks/useSafeTranslations';

/**
 * LandingPolicyRewriteDemo - Micro clause rewrite UI
 * 
 * Shows before/after transformation of legal text into plain language.
 * Compact, two-block layout with subtle arrow indicator.
 * 
 * Design: Cursor-inspired restraint
 * - Hairline borders, tight spacing
 * - Subtle contrast shift between original and rewritten
 * - Optional inline highlight for key insight
 */
export function LandingPolicyRewriteDemo() {
  const { t } = useSafeTranslations('landing.demos.policyRewrite');
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="w-full h-full flex flex-col gap-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Original clause block */}
      <div
        className="rounded-md border overflow-hidden transition-all duration-200"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.015)',
          borderColor: isHovered 
            ? 'rgba(255, 255, 255, 0.08)' 
            : 'rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Label */}
        <div
          style={{
            padding: '7px 10px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
          }}
        >
          <span
            style={{
              fontSize: '9px',
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 0.4)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {t('originalLabel')}
          </span>
        </div>

        {/* Dense legal text */}
        <div style={{ padding: '10px' }}>
          <p
            style={{
              fontSize: '10px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.35)',
              fontWeight: '400',
              letterSpacing: '-0.005em',
            }}
          >
            {t('originalText')}
          </p>
        </div>
      </div>

      {/* Arrow indicator with optional "Rewrite" chip */}
      <div className="flex items-center justify-center gap-2">
        {/* Arrow icon */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-200"
          style={{
            color: isHovered 
              ? 'rgba(139, 92, 246, 0.5)' 
              : 'rgba(255, 255, 255, 0.25)',
            transform: isHovered ? 'translateY(1px)' : 'translateY(0)',
          }}
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>

        {/* Optional "Rewrite" chip */}
        <div
          className="px-2 py-0.5 rounded-sm border transition-all duration-200"
          style={{
            backgroundColor: isHovered 
              ? 'rgba(139, 92, 246, 0.04)' 
              : 'rgba(255, 255, 255, 0.015)',
            borderColor: isHovered 
              ? 'rgba(139, 92, 246, 0.15)' 
              : 'rgba(255, 255, 255, 0.06)',
          }}
        >
          <span
            style={{
              fontSize: '8px',
              fontWeight: '600',
              color: isHovered 
                ? 'rgba(139, 92, 246, 0.7)' 
                : 'rgba(255, 255, 255, 0.3)',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
            }}
          >
            {t('rewriteChip')}
          </span>
        </div>
      </div>

      {/* Plain language block */}
      <div
        className="rounded-md border overflow-hidden transition-all duration-200"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderColor: isHovered 
            ? 'rgba(139, 92, 246, 0.2)' 
            : 'rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Label */}
        <div
          style={{
            padding: '7px 10px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          }}
        >
          <span
            style={{
              fontSize: '9px',
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 0.5)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {t('plainLanguageLabel')}
          </span>
        </div>

        {/* Simplified text - higher contrast */}
        <div style={{ padding: '10px' }}>
          <p
            style={{
              fontSize: '11px',
              lineHeight: '1.55',
              color: 'rgba(255, 255, 255, 0.65)',
              fontWeight: '400',
              letterSpacing: '-0.005em',
              marginBottom: '8px',
            }}
          >
            {t('rewrittenText')}
          </p>

          {/* Inline insight highlight */}
          <div
            className="flex items-start gap-1.5 px-2 py-1.5 rounded-sm transition-all duration-200"
            style={{
              backgroundColor: isHovered 
                ? 'rgba(139, 92, 246, 0.06)' 
                : 'rgba(139, 92, 246, 0.03)',
              borderLeft: `2px solid ${
                isHovered 
                  ? 'rgba(139, 92, 246, 0.3)' 
                  : 'rgba(139, 92, 246, 0.15)'
              }`,
            }}
          >
            <span
              style={{
                fontSize: '9px',
                fontWeight: '600',
                color: 'rgba(139, 92, 246, 0.6)',
                letterSpacing: '0.01em',
                flexShrink: 0,
              }}
            >
              {t('keyLabel')}
            </span>
            <span
              style={{
                fontSize: '9px',
                lineHeight: '1.5',
                color: 'rgba(255, 255, 255, 0.5)',
                fontWeight: '400',
                letterSpacing: '-0.005em',
              }}
            >
              {t('keyInsight')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


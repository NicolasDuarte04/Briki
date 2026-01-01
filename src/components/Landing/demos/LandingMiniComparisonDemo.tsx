'use client';

import { useState } from 'react';
import { useSafeTranslations } from '@/hooks/useSafeTranslations';

/**
 * LandingMiniComparisonDemo - Tiny comparison table for feature card
 * 
 * Cursor-inspired micro-demo:
 * - Minimal UI with tight spacing
 * - 2-3 plan columns with comparison rows
 * - Subtle highlight interaction on hover
 * - No bright colors - uses muted tones and subtle accents
 */

const createPlans = (t: any) => [
  { id: 'a', name: `${t('planPrefix')} A` },
  { id: 'b', name: `${t('planPrefix')} B` },
  { id: 'c', name: `${t('planPrefix')} C` },
];

const createComparisonData = (t: any) => [
  { 
    label: t('features.deductible'), 
    values: ['$500', '$1,000', '$500'],
    key: 'deductible',
  },
  { 
    label: t('features.coverageCap'), 
    values: ['$50K', '$100K', '$75K'],
    key: 'coverage',
  },
  { 
    label: t('features.exclusions'), 
    values: ['2', '1', '3'],
    key: 'exclusions',
  },
  { 
    label: t('features.premium'), 
    values: ['$240/mo', '$180/mo', '$210/mo'],
    key: 'premium',
  },
];

export function LandingMiniComparisonDemo() {
  const { t } = useSafeTranslations('landing.demos.comparison');
  const plans = createPlans(t);
  const comparisonData = createComparisonData(t);
  const [highlightedRow, setHighlightedRow] = useState<string | null>('deductible');
  const [showDifferences, setShowDifferences] = useState(true);

  return (
    <div className="w-full h-full flex flex-col gap-2.5">
      {/* Header with toggle pill */}
      <div className="flex items-center justify-between px-0.5">
        <span
          style={{
            fontSize: '10px',
            color: 'rgba(248, 250, 252, 0.5)',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {t('header')}
        </span>
        <button
          onClick={() => setShowDifferences(!showDifferences)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all duration-150"
          style={{
            backgroundColor: showDifferences 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(255, 255, 255, 0.02)',
            border: '0.5px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div 
            className="w-1.5 h-1.5 rounded-full transition-all duration-150"
            style={{
              backgroundColor: showDifferences 
                ? 'rgba(139, 92, 246, 0.5)' 
                : 'rgba(255, 255, 255, 0.15)',
            }}
          />
          <span
            style={{
              fontSize: '9px',
              color: 'rgba(248, 250, 252, 0.45)',
              fontWeight: '500',
              letterSpacing: '-0.005em',
            }}
          >
            {t('showDifferences')}
          </span>
        </button>
      </div>

      {/* Compact comparison table */}
      <div 
        className="rounded-md overflow-hidden"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.015)',
          border: '0.5px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Header row */}
        <div 
          className="grid grid-cols-4 gap-0"
          style={{
            borderBottom: '0.5px solid rgba(255, 255, 255, 0.04)',
            backgroundColor: 'rgba(255, 255, 255, 0.01)',
          }}
        >
          <div className="px-2 py-1.5">
            <span
              style={{
                fontSize: '9px',
                color: 'rgba(248, 250, 252, 0.45)',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {t('featureColumn')}
            </span>
          </div>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="px-2 py-1.5"
              style={{
                borderLeft: '0.5px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              <span
                style={{
                  fontSize: '9px',
                  color: 'rgba(248, 250, 252, 0.6)',
                  fontWeight: '600',
                  letterSpacing: '0.01em',
                }}
              >
                {plan.name}
              </span>
            </div>
          ))}
        </div>

        {/* Data rows */}
        {comparisonData.map((row, rowIndex) => {
          const isHighlighted = row.key === highlightedRow;
          const isLastRow = rowIndex === comparisonData.length - 1;
          const isFocalRow = row.key === 'deductible'; // Subtle focal highlight on Deductible
          
          return (
            <div
              key={row.key}
              className="grid grid-cols-4 gap-0 transition-all duration-150 cursor-pointer"
              style={{
                borderBottom: isLastRow 
                  ? 'none' 
                  : '0.5px solid rgba(255, 255, 255, 0.03)',
                backgroundColor: isFocalRow
                  ? 'rgba(255, 255, 255, 0.035)'
                  : isHighlighted 
                  ? 'rgba(255, 255, 255, 0.025)' 
                  : 'transparent',
                borderLeft: isFocalRow ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
              }}
              onMouseEnter={() => setHighlightedRow(row.key)}
              onMouseLeave={() => setHighlightedRow(null)}
            >
              {/* Feature label */}
              <div 
                className="px-2 py-2 flex items-center"
              >
                <span
                  style={{
                    fontSize: '11px',
                    color: isFocalRow
                      ? 'rgba(248, 250, 252, 0.85)'
                      : isHighlighted 
                      ? 'rgba(248, 250, 252, 0.8)' 
                      : 'rgba(248, 250, 252, 0.6)',
                    fontWeight: isFocalRow ? '600' : '500',
                    transition: 'color 150ms',
                    letterSpacing: '-0.005em',
                  }}
                >
                  {row.label}
                </span>
              </div>

              {/* Values */}
              {row.values.map((value, idx) => (
                <div
                  key={idx}
                  className="px-2 py-2 flex items-center"
                  style={{
                    borderLeft: '0.5px solid rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      color: isFocalRow
                        ? 'rgba(248, 250, 252, 0.8)'
                        : isHighlighted 
                        ? 'rgba(248, 250, 252, 0.8)' 
                        : 'rgba(248, 250, 252, 0.65)',
                      fontWeight: isFocalRow ? '600' : '400',
                      transition: 'color 150ms',
                      letterSpacing: '-0.005em',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Micro hint text */}
      <div className="flex items-center justify-center px-1 pt-0.5">
        <span
          style={{
            fontSize: '8px',
            color: 'rgba(248, 250, 252, 0.25)',
            fontWeight: '400',
            letterSpacing: '0.01em',
          }}
        >
          {t('hoverHint')}
        </span>
      </div>
    </div>
  );
}


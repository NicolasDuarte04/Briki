'use client';

import { 
  FileText, 
  CheckCircle2, 
  Shield, 
  AlertTriangle,
  DollarSign,
  Users,
  Calendar
} from 'lucide-react';
import { useSafeTranslations } from '@/hooks/useSafeTranslations';

/**
 * LandingPolicyComparisonDemo - Static demo of multi-policy comparison
 * 
 * Shows a snapshot of the policy comparison table with:
 * - Multiple policies side-by-side
 * - Highlighted coverage differences
 * - Visual indicators for better/worse coverage
 * 
 * Design tokens: Cursor-inspired restraint
 * - Mostly neutrals with subtle surface variations
 * - Accent color used sparingly (borders/text only)
 * - Status indicators are hints, not fills
 */

// Demo-only color tokens - restrained palette
const DEMO_TOKENS = {
  // Highlight: subtle left indicator instead of background fill
  highlight: {
    border: 'rgba(59, 130, 246, 0.4)',      // Soft blue border
    borderWidth: '2px',
    background: 'transparent',               // No fill
    text: 'var(--briki-text)',              // Normal text, not colored
  },
  // Success: text-only or minimal border hint
  success: {
    text: 'rgba(34, 197, 94, 0.7)',         // Muted green text
    border: 'rgba(34, 197, 94, 0.15)',      // Very subtle border
    background: 'rgba(34, 197, 94, 0.03)',  // Barely visible fill (3%)
  },
  // Neutral surfaces
  surface: {
    base: 'rgba(255, 255, 255, 0.01)',
    elevated: 'rgba(255, 255, 255, 0.02)',
    hover: 'rgba(255, 255, 255, 0.04)',
  },
} as const;

// Mock comparison data
const policies = [
  {
    id: '1',
    insurer: 'MetLife',
    policyNumber: 'ML-2024-8392',
    confidence: 98,
    selected: true,
  },
  {
    id: '2',
    insurer: 'AXA Seguros',
    policyNumber: 'AXA-VD-4721',
    confidence: 95,
    selected: true,
  },
  {
    id: '3',
    insurer: 'GNP Seguros',
    policyNumber: 'GNP-2024-1156',
    confidence: 92,
    selected: false,
  },
];

const createComparisonRows = (t: any) => [
  {
    category: t('categories.coverage'),
    concept: t('concepts.insuredAmount'),
    icon: Shield,
    values: ['$500,000', '$750,000', '$400,000'],
    highlights: [false, true, false], // AXA has best coverage
  },
  {
    category: t('categories.coverage'),
    concept: t('concepts.accidentalDeath'),
    icon: Shield,
    values: [t('values.included'), t('values.included'), t('values.notIncluded')],
    highlights: [true, true, false],
  },
  {
    category: t('categories.coverage'),
    concept: t('concepts.totalDisability'),
    icon: Shield,
    values: [t('values.included'), t('values.included'), t('values.included')],
    highlights: [true, true, true],
  },
  {
    category: t('categories.financial'),
    concept: t('concepts.monthlyPremium'),
    icon: DollarSign,
    values: ['$375', '$520', '$290'],
    highlights: [false, false, true], // GNP has best price
  },
  {
    category: t('categories.financial'),
    concept: t('concepts.deductible'),
    icon: DollarSign,
    values: ['$0', '$0', '$5,000'],
    highlights: [true, true, false],
  },
  {
    category: t('categories.exclusions'),
    concept: t('concepts.extremeSports'),
    icon: AlertTriangle,
    values: ['Excluido', 'Cubierto', 'Excluido'],
    highlights: [false, true, false],
  },
  {
    category: t('categories.exclusions'),
    concept: t('concepts.waitingPeriod'),
    icon: Calendar,
    values: [t('values.days', { count: 90 }), t('values.days', { count: 30 }), t('values.days', { count: 120 })],
    highlights: [false, true, false],
  },
  {
    category: t('categories.beneficiaries'),
    concept: t('concepts.maxBeneficiaries'),
    icon: Users,
    values: ['2', '4', '2'],
    highlights: [false, true, false],
  },
];

export function LandingPolicyComparisonDemo() {
  const { t } = useSafeTranslations('landing.demos.policyComparison');
  const comparisonRows = createComparisonRows(t);
  return (
    <div 
      className="w-full max-w-[1000px] mx-auto h-full rounded-lg overflow-hidden flex flex-col text-sm relative"
      style={{ 
        backgroundColor: 'var(--briki-bg)',
        boxShadow: `
          0 0 0 0.5px rgba(255, 255, 255, 0.06),
          0 1px 1px rgba(0, 0, 0, 0.12),
          0 2px 4px rgba(0, 0, 0, 0.14),
          0 4px 8px rgba(0, 0, 0, 0.16),
          0 8px 16px rgba(0, 0, 0, 0.18),
          0 16px 32px rgba(0, 0, 0, 0.20)
        `,
        border: '0.5px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '0.5px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div>
          <h3 
            className="text-[11px] font-medium leading-tight"
            style={{ color: 'var(--briki-text)' }}
          >
            {t('title')}
          </h3>
          <p 
            className="text-[9px] leading-tight"
            style={{ color: 'var(--briki-text-subtle)' }}
          >
            {t('subtitle', { count: 3, selected: 2 })}
          </p>
        </div>
        <button
          className="px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors"
          style={{
            backgroundColor: 'var(--briki-primary-surface)',
            color: 'var(--briki-primary)',
            border: '0.5px solid var(--briki-primary-border)',
          }}
        >
          {t('generateProposal')}
        </button>
      </div>

      {/* Comparison Table */}
      <div className="flex-1 overflow-auto">
        {/* Table Header - Policy Cards */}
        <div 
          className="grid grid-cols-[180px_repeat(3,1fr)] gap-0"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderBottom: '0.5px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="p-3">
            <span 
              className="text-[9px] uppercase tracking-wider font-medium"
              style={{ color: 'var(--briki-text-subtle)' }}
            >
              {t('conceptColumn')}
            </span>
          </div>
          {policies.map((policy, idx) => (
            <div 
              key={policy.id}
              className="p-3 flex flex-col gap-1"
              style={{
                borderLeft: idx > 0 ? '0.5px solid rgba(255, 255, 255, 0.06)' : 'none',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-3 h-3 rounded-sm flex items-center justify-center"
                  style={{
                    backgroundColor: policy.selected 
                      ? 'var(--briki-primary)' 
                      : 'rgba(255, 255, 255, 0.1)',
                    border: policy.selected 
                      ? 'none' 
                      : '0.5px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  {policy.selected && (
                    <CheckCircle2 
                      className="w-2 h-2" 
                      style={{ color: 'white' }}
                      strokeWidth={3}
                    />
                  )}
                </div>
                <span 
                  className="text-[9px] uppercase tracking-wider"
                  style={{ color: 'var(--briki-text-subtle)' }}
                >
                  {t('includeLabel')}
                </span>
              </div>
              <span 
                className="text-[11px] font-semibold"
                style={{ color: 'var(--briki-text)' }}
              >
                {policy.insurer}
              </span>
              <span 
                className="text-[9px]"
                style={{ color: 'var(--briki-text-muted)' }}
              >
                {policy.policyNumber}
              </span>
              <div 
                className="text-[8px] px-1.5 py-0.5 rounded w-fit mt-0.5"
                style={{
                  backgroundColor: DEMO_TOKENS.success.background,
                  color: DEMO_TOKENS.success.text,
                  border: `0.5px solid ${DEMO_TOKENS.success.border}`,
                }}
              >
                {t('confidence', { percent: policy.confidence })}
              </div>
            </div>
          ))}
        </div>

        {/* Table Body - Comparison Rows */}
        <div className="flex flex-col">
          {/* Group by category */}
          {[t('categories.coverage'), t('categories.financial'), t('categories.exclusions'), t('categories.beneficiaries')].map((category) => {
            const categoryRows = comparisonRows.filter(r => r.category === category);
            
            return (
              <div key={category}>
                {/* Category Header */}
                <div 
                  className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider sticky top-0"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--briki-text-subtle)',
                    borderTop: '0.5px solid rgba(255, 255, 255, 0.06)',
                    borderBottom: '0.5px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {category}
                </div>

                {/* Rows */}
                {categoryRows.map((row, rowIdx) => (
                  <div 
                    key={rowIdx}
                    className="grid grid-cols-[180px_repeat(3,1fr)] gap-0 transition-colors"
                    style={{
                      backgroundColor: rowIdx % 2 === 0 
                        ? 'rgba(255, 255, 255, 0.01)' 
                        : 'transparent',
                      borderBottom: '0.5px solid rgba(255, 255, 255, 0.04)',
                    }}
                  >
                    {/* Concept column */}
                    <div className="p-3 flex items-center gap-2">
                      <row.icon 
                        className="w-3 h-3 flex-shrink-0" 
                        style={{ color: 'var(--briki-text-subtle)' }}
                        strokeWidth={2}
                      />
                      <span 
                        className="text-[10px]"
                        style={{ color: 'var(--briki-text-muted)' }}
                      >
                        {row.concept}
                      </span>
                    </div>

                    {/* Value columns */}
                    {row.values.map((value, valIdx) => (
                      <div 
                        key={valIdx}
                        className="p-3 flex items-center relative"
                        style={{
                          borderLeft: valIdx > 0 ? '0.5px solid rgba(255, 255, 255, 0.04)' : 'none',
                          backgroundColor: DEMO_TOKENS.highlight.background,
                        }}
                      >
                        {/* Subtle left indicator for highlighted values */}
                        {row.highlights[valIdx] && (
                          <div 
                            className="absolute left-0 top-0 bottom-0"
                            style={{
                              width: DEMO_TOKENS.highlight.borderWidth,
                              backgroundColor: DEMO_TOKENS.highlight.border,
                            }}
                          />
                        )}
                        <span 
                          className="text-[10px]"
                          style={{ 
                            color: DEMO_TOKENS.highlight.text,
                            fontWeight: row.highlights[valIdx] ? 500 : 400,
                          }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer - Action hint */}
      <div 
        className="px-4 py-2.5 flex items-center justify-between"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderTop: '0.5px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="flex items-center gap-2">
          <FileText 
            className="w-3.5 h-3.5" 
            style={{ color: 'var(--briki-text-subtle)' }}
            strokeWidth={2}
          />
          <span 
            className="text-[9px]"
            style={{ color: 'var(--briki-text-muted)' }}
          >
            {t('footerHint')}
          </span>
        </div>
        <span 
          className="text-[9px] font-medium"
          style={{ color: 'var(--briki-text)' }}
        >
          {t('selectedCount', { count: 2 })}
        </span>
      </div>
    </div>
  );
}


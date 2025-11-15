/**
 * LandingStatsGrowth Component
 * 
 * Displays Briki's traction and product impact through a growth curve visualization
 * with key performance metrics.
 * 
 * Design Requirements:
 * - Lightweight: Pure SVG curve, no heavy charting libraries
 * - Accessible: AA contrast, semantic HTML, proper ARIA labels
 * - Responsive: Mobile-first, single column → two column layout
 * - Design System: Uses Briki CSS variables and typography tokens only
 * 
 * Content Model:
 * - Primary stat: Large center metric (e.g., hours saved, proposals generated)
 * - Secondary stats: 4 mini-stats in right rail (brokers, policies, time saved, integrations)
 * - Copy block: Title, description, and CTA
 * 
 * Data Sources:
 * - All metrics should be verified before production use
 * - Current values use qualitative/directional language (~, +)
 * - Update i18n strings with actual verified numbers
 * 
 * Performance:
 * - Inline SVG curve (~2KB)
 * - No external dependencies beyond Lucide icons
 * - No layout shift: fixed dimensions
 */

'use client';

import { useSafeTranslations } from '@/hooks/useSafeTranslations';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TrendingUp, Users, FileText, Clock, Zap } from 'lucide-react';
import Link from 'next/link';
import { pathForAgent, toLocale } from '@/lib/routes/workspace';

export function LandingStatsGrowth() {
  const { t } = useSafeTranslations('landing.statsGrowth');
  const locale = useLocale();

  // Smooth growth curve data points (normalized 0-100 for percentage-based SVG)
  const curvePoints = [
    { x: 0, y: 80 },
    { x: 20, y: 70 },
    { x: 40, y: 55 },
    { x: 60, y: 35 },
    { x: 80, y: 20 },
    { x: 100, y: 10 },
  ];

  // Generate smooth path using quadratic curves
  const generateSmoothPath = () => {
    if (curvePoints.length === 0) return '';
    
    // ✅ CORRECCIÓN: Type guard explícito para el primer punto
    // Aunque curvePoints es constante, TypeScript no puede inferir que siempre tiene elementos
    const firstPoint = curvePoints[0];
    if (!firstPoint) return ''; // Safety check (nunca debería ocurrir con datos actuales)
    
    let path = `M ${firstPoint.x} ${firstPoint.y}`;
    
    for (let i = 0; i < curvePoints.length - 1; i++) {
      const current = curvePoints[i];
      const next = curvePoints[i + 1];
      
      // ✅ CORRECCIÓN: Type guard para verificar ambos puntos existen
      // Previene errores si el array se modifica o tiene datos inesperados
      if (!current || !next) continue; // Safety check
      
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      
      path += ` Q ${current.x} ${current.y}, ${midX} ${midY}`;
    }
    
    // ✅ CORRECCIÓN: Type guard para el último punto
    const last = curvePoints[curvePoints.length - 1];
    if (!last) return path; // Safety check (retorna path parcial si falla)
    
    path += ` L ${last.x} ${last.y}`;
    
    return path;
  };

  const statsData = [
    {
      icon: Users,
      value: t('stats.brokers.value'),
      label: t('stats.brokers.label'),
    },
    {
      icon: FileText,
      value: t('stats.policies.value'),
      label: t('stats.policies.label'),
    },
    {
      icon: Clock,
      value: t('stats.timeSaved.value'),
      label: t('stats.timeSaved.label'),
    },
    {
      icon: Zap,
      value: t('stats.integrations.value'),
      label: t('stats.integrations.label'),
    },
  ];

  return (
    <section 
      className="py-24 sm:py-32 px-6 sm:px-8 bg-[var(--briki-surface)]"
      aria-labelledby="stats-heading"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_1.3fr] gap-12 lg:gap-16 items-center">
          {/* Left: Text & CTA */}
          <div className="flex flex-col justify-center gap-6">
            <h2
              id="stats-heading"
              className="text-headline font-bold text-[var(--briki-text)] font-smooth"
            >
              {t('title')}
            </h2>
            <p className="text-subhead text-[var(--briki-text-muted)] font-smooth line-length-wide">
              {t('description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <Button
                size="lg"
                className="font-medium"
                asChild
              >
                <Link href={pathForAgent(toLocale(locale))}>
                  {t('cta.primary')}
                </Link>
              </Button>
            </div>
          </div>

          {/* Right: Growth Curve Card */}
          <Card className="relative overflow-hidden rounded-[20px] border border-[var(--briki-border)] bg-gradient-to-br from-[var(--briki-surface)] to-[var(--briki-surface-alt)] p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
            {/* SVG Growth Curve */}
            <div className="relative w-full h-[200px] sm:h-[240px] mb-4">
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--briki-primary)" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="var(--briki-primary)" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                
                {/* Gradient area under curve */}
                <path
                  d={`${generateSmoothPath()} L 100 100 L 0 100 Z`}
                  fill="url(#curveGradient)"
                />
                
                {/* Curve line */}
                <path
                  d={generateSmoothPath()}
                  fill="none"
                  stroke="var(--briki-primary)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* Center Primary Stat Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-8 h-8 text-[var(--briki-primary)]" aria-hidden="true" />
                </div>
                <div className="text-5xl sm:text-6xl font-extrabold text-[var(--briki-text)] font-smooth drop-shadow-sm">
                  {t('primaryStat.value')}
                </div>
                <p className="mt-2 text-body text-[var(--briki-text-muted)] font-medium">
                  {t('primaryStat.label')}
                </p>
              </div>
            </div>

            {/* Bottom Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {statsData.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 p-4 rounded-xl bg-[var(--briki-surface)] border border-[var(--briki-border)]"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-[var(--briki-primary)]" aria-hidden="true" />
                      <span className="text-xl sm:text-2xl font-semibold text-[var(--briki-text)] font-smooth">
                        {stat.value}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--briki-text-muted)]">
                      {stat.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

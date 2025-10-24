'use client';

import { Sparkles, BarChart3, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useSafeTranslations } from '@/hooks/useSafeTranslations';

export function LandingFeatures() {
  const { t, tRaw } = useSafeTranslations('landing.features');
  const featureKeys = ['extraction', 'comparisons', 'outputs'] as const;

  return (
    <section className="py-32 px-6 sm:px-8 bg-[var(--briki-surface)]">
      <div className="max-w-6xl mx-auto">
        <h2
          className="text-center mb-16 text-headline font-bold text-[var(--briki-text)] font-smooth"
        >
          {t('heading')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featureKeys.map((key, index) => {
            const Icon = [Sparkles, BarChart3, FileText][index] as React.ComponentType<any>;
            const bullets = tRaw(`items.${key}.bullets`, []) as string[];

            return (
              <Card
                key={key}
                className="p-8 rounded-[20px] border border-[var(--briki-border)] bg-[var(--briki-surface)] shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
              >
                <div className="mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--briki-primary)]/10"
                  >
                    <Icon className="w-6 h-6 text-[var(--briki-primary)]" />
                  </div>
                </div>
                <h3
                  className="mb-4 text-xl sm:text-2xl font-semibold text-[var(--briki-text)] tracking-tight font-smooth"
                >
                  {t(`items.${key}.title`)}
                </h3>
                <ul className="space-y-2">
                  {bullets.map((bullet: string, bulletIndex: number) => (
                    <li
                      key={bulletIndex}
                      className="text-body text-[var(--briki-text-muted)] font-smooth"
                    >
                      • {bullet}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}


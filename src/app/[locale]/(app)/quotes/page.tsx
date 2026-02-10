// src/app/[locale]/(app)/quotes/page.tsx
/**
 * Página principal del Dashboard de Cotizaciones
 * 
 * Esta ruta muestra un resumen de todas las cotizaciones standalone de la organización,
 * independientes de casos específicos. Permite:
 * - Ver métricas generales de cotizaciones
 * - Acceder a cotizaciones recientes
 * - Navegar a subpáginas de análisis y upload
 */

import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { countOrgStandaloneQuotes, getOrgStandaloneQuotes } from '@/lib/helpers/getOrgQuotesContainer';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, Upload, BarChart3, FileSearch, TrendingUp, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { Locale } from '@/lib/routes/workspace';
import { pathForQuotesUpload, pathForQuotesAnalysis, pathForQuotesOverview } from '@/lib/routes/workspace';

export const dynamic = 'force-dynamic';

// ============================================================================
// HELPER: Safely extract string
// ============================================================================

function safeString(value: any, fallback: string = 'No disponible'): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'object') {
    if (value.name) return String(value.name);
    if (value.value) return String(value.value);
    const firstValue = Object.values(value).find(v => typeof v === 'string' && v.length > 0);
    if (firstValue) return String(firstValue);
  }
  return String(value);
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  try {
    return new Date(dateStr) < new Date();
  } catch {
    return false;
  }
}

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

function QuotesDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Quotes */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface QuoteMetricsProps {
  totalQuotes: number;
  analyzed: number;
  pending: number;
  expiredCount: number;
  t: (key: string) => string;
}

function QuoteMetrics({ totalQuotes, analyzed, pending, expiredCount, t }: QuoteMetricsProps) {
  const metrics = [
    {
      label: t('dashboard.totalQuotes'),
      value: totalQuotes,
      icon: Receipt,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: t('dashboard.analyzed'),
      value: analyzed,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: t('dashboard.pendingAnalysis'),
      value: pending,
      icon: AlertTriangle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: t('dashboard.expiredQuotes'),
      value: expiredCount,
      icon: Clock,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="text-3xl font-bold mt-1">{metric.value}</p>
              </div>
              <div className={`p-3 rounded-full ${metric.bgColor}`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface QuickActionsProps {
  locale: Locale;
  t: (key: string) => string;
}

function QuickActions({ locale, t }: QuickActionsProps) {
  const actions = [
    {
      label: t('dashboard.uploadNew'),
      href: pathForQuotesUpload(locale),
      icon: Upload,
      variant: 'default' as const,
    },
    {
      label: t('dashboard.viewAnalysis'),
      href: pathForQuotesAnalysis(locale),
      icon: FileSearch,
      variant: 'outline' as const,
    },
    {
      label: t('dashboard.viewOverview'),
      href: pathForQuotesOverview(locale),
      icon: BarChart3,
      variant: 'outline' as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('dashboard.quickActions')}</CardTitle>
        <CardDescription>{t('dashboard.quickActionsDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <Button key={action.label} variant={action.variant} asChild>
              <Link href={action.href}>
                <action.icon className="h-4 w-4 mr-2" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface RecentQuotesListProps {
  quotes: any[];
  locale: Locale;
  t: (key: string) => string;
}

function RecentQuotesList({ quotes, locale, t }: RecentQuotesListProps) {
  if (quotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('dashboard.recentQuotes')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">{t('dashboard.noQuotesYet')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('dashboard.uploadFirst')}
            </p>
            <Button asChild>
              <Link href={pathForQuotesUpload(locale)}>
                <Upload className="h-4 w-4 mr-2" />
                {t('dashboard.uploadNew')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">{t('dashboard.recentQuotes')}</CardTitle>
          <CardDescription>{t('dashboard.lastUploaded')}</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={pathForQuotesAnalysis(locale)}>
            {t('dashboard.viewAll')}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {quotes.slice(0, 5).map((quote) => {
            const analysis = quote.quoteAnalyses?.[0];
            const expired = analysis?.validUntil ? isExpired(analysis.validUntil.toISOString()) : false;
            
            return (
              <Link
                key={quote.id}
                href={analysis ? `/quotes/analysis/${analysis.id}` : '#'}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Receipt className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {safeString(analysis?.insurer, quote.fileName || 'Cotización')}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {safeString(analysis?.product, 'Producto no identificado')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {expired && (
                    <Badge variant="outline" className="text-red-600 border-red-200">
                      <Clock className="h-3 w-3 mr-1" />
                      {t('dashboard.expired')}
                    </Badge>
                  )}
                  {analysis ? (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t('dashboard.analyzed')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-200">
                      <Clock className="h-3 w-3 mr-1" />
                      {t('dashboard.pending')}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PAGE CONTENT
// ============================================================================

async function QuotesDashboardContent({ locale }: { locale: Locale }) {
  const t = await getTranslations('quotes');
  const { currentOrg } = await getCurrentOrg();
  
  // Fetch data - getOrgStandaloneQuotes returns QuoteAnalysis[] directly
  const [totalCount, quotes] = await Promise.all([
    countOrgStandaloneQuotes(currentOrg.id),
    getOrgStandaloneQuotes(currentOrg.id, { take: 10 }),
  ]);
  
  // Calculate metrics - quotes are already QuoteAnalysis objects
  // validUntil is inside extractedData JSON
  const analyzed = quotes.length; // All returned quotes are analyzed
  const pending = 0; // No pending concept for standalone quotes
  const expiredCount = quotes.filter((q) => {
    const extractedData = q.extractedData as Record<string, unknown> | null;
    const validUntil = extractedData?.valid_until || extractedData?.validity_end;
    if (!validUntil || typeof validUntil !== 'string') return false;
    return isExpired(validUntil);
  }).length;
  
  return (
    <div className="space-y-6">
      {/* Metrics */}
      <QuoteMetrics
        totalQuotes={totalCount}
        analyzed={analyzed}
        pending={pending}
        expiredCount={expiredCount}
        t={t}
      />
      
      {/* Quick Actions */}
      <QuickActions locale={locale} t={t} />
      
      {/* Recent Quotes */}
      <RecentQuotesList quotes={quotes} locale={locale} t={t} />
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function QuotesPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('quotes');
  
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          {t('dashboard.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('dashboard.description')}
        </p>
      </div>

      {/* Content */}
      <Suspense fallback={<QuotesDashboardSkeleton />}>
        <QuotesDashboardContent locale={locale} />
      </Suspense>
    </div>
  );
}

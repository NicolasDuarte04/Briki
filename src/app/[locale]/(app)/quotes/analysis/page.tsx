// src/app/[locale]/(app)/quotes/analysis/page.tsx
/**
 * Página de Análisis de Cotizaciones (Listado)
 * 
 * Muestra grid de tarjetas compactas de cotizaciones con:
 * - Búsqueda y filtros
 * - Pinneo y eliminación
 * - Links a página de detalle individual
 * 
 * Sigue el patrón de /policies/analysis
 */

import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { getOrgStandaloneQuotes, countOrgStandaloneQuotes } from '@/lib/helpers/getOrgQuotesContainer';
import { getUserPins } from '@/lib/data/workspace';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuoteList } from '@/components/Quotes/QuoteList';
import { ArrowLeft, Receipt } from 'lucide-react';
import Link from 'next/link';
import type { Locale } from '@/lib/routes/workspace';
import { pathForQuotes, pathForQuotesUpload } from '@/lib/routes/workspace';

export const dynamic = 'force-dynamic';

// ============================================================================
// SKELETON
// ============================================================================

function AnalysisSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Search bar skeleton */}
      <div className="flex flex-col md:flex-row gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[140px]" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      
      {/* Stats skeleton */}
      <Skeleton className="h-5 w-48" />
      
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
              <div className="space-y-2 mt-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

interface EmptyStateProps {
  locale: Locale;
  t: (key: string) => string;
}

function EmptyState({ locale, t }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('analysisPage.noQuotesAnalyzed')}</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {t('analysisPage.noQuotesDescription')}
          </p>
          <Button asChild>
            <Link href={pathForQuotesUpload(locale)}>
              {t('analysisPage.uploadFirst')}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CONTENT
// ============================================================================

async function AnalysisContent({ locale }: { locale: Locale }) {
  const t = await getTranslations('quotes');
  const { user, currentOrg } = await getCurrentOrg();

  // Fetch quotes and pins - getOrgStandaloneQuotes returns QuoteAnalysis[] directly
  const [quotesRaw, totalCount, pins] = await Promise.all([
    getOrgStandaloneQuotes(currentOrg.id, { take: 100 }),
    countOrgStandaloneQuotes(currentOrg.id),
    getUserPins(user.id),
  ]);

  // Extract pinned quote IDs - pins is UserPins object with quotes array
  const pinnedQuoteIds = new Set<string>(pins.quotes || []);

  // Transform data for QuoteList component
  // IMPORTANTE: Seguimos el patrón de PolicyList - pasamos extractedData como JSON
  // y overallConfidence del modelo, NO propiedades aplanadas
  const quotes = quotesRaw.map((quote: any) => ({
    id: quote.id,
    artifactId: quote.artifactId,
    extractedData: quote.extractedData as Record<string, unknown> | null,
    overallConfidence: Number(quote.overallConfidence) || 0,
    extractedAt: quote.extractedAt,
    artifact: quote.artifact ? {
      fileName: quote.artifact.fileName,
    } : null,
  }));

  return (
    <div className="space-y-6">
      {/* Content */}
      {quotes.length === 0 ? (
        <EmptyState locale={locale} t={t} />
      ) : (
        <QuoteList
          quotes={quotes}
          orgId={currentOrg.id}
          pinnedQuoteIds={pinnedQuoteIds}
          basePath="/quotes/analysis"
        />
      )}
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function QuotesAnalysisPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('quotes');

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={pathForQuotes(locale)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('analysisPage.backToQuotes')}
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              {t('analysisPage.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('analysisPage.subtitle')}
            </p>
          </div>
          <Button asChild>
            <Link href={pathForQuotesUpload(locale)}>
              {t('analysisPage.uploadNew')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <Suspense fallback={<AnalysisSkeleton />}>
        <AnalysisContent locale={locale} />
      </Suspense>
    </div>
  );
}

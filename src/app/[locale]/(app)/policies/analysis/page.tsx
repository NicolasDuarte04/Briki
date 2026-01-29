// src/app/[locale]/(app)/policies/analysis/page.tsx
/**
 * Página de Análisis de Pólizas (Listado)
 * 
 * Muestra grid de tarjetas compactas de pólizas con:
 * - Búsqueda y filtros
 * - Pinneo y eliminación
 * - Links a página de detalle individual
 * 
 * Sigue el patrón de /workspace/cases
 */

import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { getOrgStandalonePolicies, countOrgStandalonePolicies } from '@/lib/helpers/getOrgPoliciesContainer';
import { getUserPins } from '@/lib/data/workspace';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PolicyList } from '@/components/Policies/PolicyList';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import type { Locale } from '@/lib/routes/workspace';
import { pathForPolicies, pathForPoliciesUpload } from '@/lib/routes/workspace';

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
  translations: {
    noPoliciesAnalyzed: string;
    noPoliciesDescription: string;
    uploadFirst: string;
  };
}

function EmptyState({ locale, translations }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{translations.noPoliciesAnalyzed}</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {translations.noPoliciesDescription}
          </p>
          <Button asChild>
            <Link href={pathForPoliciesUpload(locale)}>
              {translations.uploadFirst}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ANALYSIS CONTENT (Server Component)
// ============================================================================

interface AnalysisContentProps {
  locale: Locale;
  translations: {
    noPoliciesAnalyzed: string;
    noPoliciesDescription: string;
    uploadFirst: string;
    stats: {
      totalPolicies: string;
      highConfidence: string;
      mediumConfidence: string;
      pinned: string;
    };
  };
}

async function AnalysisContent({ locale, translations }: AnalysisContentProps) {
  const { user, currentOrg } = await getCurrentOrg();
  const orgId = currentOrg.id;

  // Fetch policies and pins in parallel
  const [totalPolicies, policies, userPins] = await Promise.all([
    countOrgStandalonePolicies(orgId),
    getOrgStandalonePolicies(orgId, { take: 50 }), // Get more for filtering
    getUserPins(user.id),
  ]);

  if (policies.length === 0) {
    return <EmptyState locale={locale} translations={translations} />;
  }

  // Convert pinned policy IDs to Set for efficient lookup
  const pinnedPolicyIds = new Set(userPins.policies);

  // Serialize policies for client component
  const serializedPolicies = policies.map(policy => ({
    id: policy.id,
    artifactId: policy.artifactId,
    extractedData: policy.extractedData as Record<string, unknown> | null,
    overallConfidence: Number(policy.overallConfidence),
    extractedAt: policy.extractedAt,
    artifact: policy.artifact ? {
      fileName: policy.artifact.fileName,
    } : null,
  }));

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalPolicies}</div>
            <div className="text-sm text-muted-foreground">{translations.stats.totalPolicies}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {policies.filter(p => Number(p.overallConfidence) >= 0.8).length}
            </div>
            <div className="text-sm text-muted-foreground">{translations.stats.highConfidence}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {policies.filter(p => {
                const conf = Number(p.overallConfidence);
                return conf >= 0.5 && conf < 0.8;
              }).length}
            </div>
            <div className="text-sm text-muted-foreground">{translations.stats.mediumConfidence}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{pinnedPolicyIds.size}</div>
            <div className="text-sm text-muted-foreground">{translations.stats.pinned}</div>
          </CardContent>
        </Card>
      </div>

      {/* Policy List with search, filters, and grid */}
      <PolicyList
        policies={serializedPolicies}
        orgId={orgId}
        pinnedPolicyIds={pinnedPolicyIds}
        basePath="/policies/analysis"
      />
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default async function PoliciesAnalysisPage({
  params,
}: {
  params: { locale: string };
}) {
  const awaitedParams = await params;
  const locale = awaitedParams.locale as Locale;
  const t = await getTranslations('policies.analysisPage');

  const translations = {
    noPoliciesAnalyzed: t('noPoliciesAnalyzed'),
    noPoliciesDescription: t('noPoliciesDescription'),
    uploadFirst: t('uploadFirst'),
    stats: {
      totalPolicies: t('stats.totalPolicies'),
      highConfidence: t('stats.highConfidence'),
      mediumConfidence: t('stats.mediumConfidence'),
      pinned: t('stats.pinned'),
    },
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      {/* Header with Back Button */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={pathForPolicies(locale)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToPolicies')}
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('subtitle')}
            </p>
          </div>
          <Button asChild>
            <Link href={pathForPoliciesUpload(locale)}>
              {t('uploadNew')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <Suspense fallback={<AnalysisSkeleton />}>
        <AnalysisContent locale={locale} translations={translations} />
      </Suspense>
    </div>
  );
}

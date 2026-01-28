// src/app/[locale]/(app)/policies/page.tsx
/**
 * Página principal del Dashboard de Pólizas
 * 
 * Esta ruta muestra un resumen de todas las pólizas standalone de la organización,
 * independientes de casos específicos. Permite:
 * - Ver métricas generales de pólizas
 * - Acceder a pólizas recientes
 * - Navegar a subpáginas de análisis y upload
 */

import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { countOrgStandalonePolicies, getOrgStandalonePolicies } from '@/lib/helpers/getOrgPoliciesContainer';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, BarChart3, FileSearch, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';
import type { Locale } from '@/lib/routes/workspace';
import { pathForPoliciesUpload, pathForPoliciesAnalysis, pathForPoliciesOverview } from '@/lib/routes/workspace';

export const dynamic = 'force-dynamic';

// ============================================================================
// HELPER: Safely extract string from potentially nested object
// ============================================================================

/**
 * Extrae un valor string de un campo que puede ser string u objeto.
 * Los datos de pólizas extraídos por IA pueden tener estructuras como:
 * - insurer: "Seguros ABC" (string)
 * - insurer: { name: "Seguros ABC", contact: "..." } (object)
 */
function safeString(value: any, fallback: string = 'No disponible'): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value || fallback;
  }
  if (typeof value === 'object') {
    // Intentar extraer campos comunes
    if (value.name) return String(value.name);
    if (value.value) return String(value.value);
    if (value.text) return String(value.text);
    // Si es un objeto, intentar mostrar el primer valor string
    const firstValue = Object.values(value).find(v => typeof v === 'string' && v.length > 0);
    if (firstValue) return String(firstValue);
    // Último recurso: JSON string truncado
    try {
      const json = JSON.stringify(value);
      return json.length > 50 ? json.substring(0, 47) + '...' : json;
    } catch {
      return fallback;
    }
  }
  // Números u otros tipos
  return String(value);
}

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

function PoliciesDashboardSkeleton() {
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
      
      {/* Recent Policies */}
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

interface PolicyMetricsProps {
  totalPolicies: number;
  highConfidence: number;
  pendingReview: number;
  recentUploads: number;
  t: (key: string) => string;
}

async function PolicyMetrics({ totalPolicies, highConfidence, pendingReview, recentUploads, t }: PolicyMetricsProps) {
  const metrics = [
    {
      label: t('dashboard.totalPolicies'),
      value: totalPolicies,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: t('dashboard.highConfidence'),
      value: highConfidence,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: t('dashboard.pendingReview'),
      value: pendingReview,
      icon: AlertTriangle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: t('dashboard.recentUploads'),
      value: recentUploads,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
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

async function QuickActions({ locale, t }: QuickActionsProps) {
  const actions = [
    {
      label: t('dashboard.uploadNew'),
      href: pathForPoliciesUpload(locale),
      icon: Upload,
      variant: 'default' as const,
    },
    {
      label: t('dashboard.viewAnalysis'),
      href: pathForPoliciesAnalysis(locale),
      icon: FileSearch,
      variant: 'outline' as const,
    },
    {
      label: t('dashboard.viewMetrics'),
      href: pathForPoliciesOverview(locale),
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

interface RecentPoliciesListProps {
  policies: any[];
  locale: Locale;
  t: (key: string) => string;
}

async function RecentPoliciesList({ policies, locale, t }: RecentPoliciesListProps) {
  if (policies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('dashboard.recentPolicies')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">{t('dashboard.noPoliciesYet')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('dashboard.uploadFirst')}
            </p>
            <Button asChild>
              <Link href={pathForPoliciesUpload(locale)}>
                <Upload className="h-4 w-4 mr-2" />
                {t('dashboard.uploadPolicy')}
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
          <CardTitle className="text-lg">{t('dashboard.recentPolicies')}</CardTitle>
          <CardDescription>{t('dashboard.recentPoliciesDesc')}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={pathForPoliciesAnalysis(locale)}>{t('dashboard.viewAll')}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {policies.map((policy) => {
            const extractedData = policy.extractedData as any;
            const policyNumber = safeString(extractedData?.policy_number, t('dashboard.noNumber'));
            const insurer = safeString(extractedData?.insurer, t('dashboard.unknownInsurer'));
            const confidence = Number(policy.overallConfidence) * 100;
            
            return (
              <Link
                key={policy.id}
                href={`/${locale}/policies/analysis/${policy.id}`}
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {policy.artifact?.fileName || t('dashboard.policyNoName')}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {policyNumber} • {insurer}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    confidence >= 80 
                      ? 'bg-green-500/10 text-green-600' 
                      : confidence >= 50 
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-red-500/10 text-red-600'
                  }`}>
                    {confidence.toFixed(0)}%
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(policy.extractedAt).toLocaleDateString()}
                  </span>
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
// DASHBOARD CONTENT (STREAMED)
// ============================================================================

async function PoliciesDashboardContent({ locale }: { locale: Locale }) {
  const t = await getTranslations('policies');
  const { currentOrg } = await getCurrentOrg();
  const orgId = currentOrg.id;

  // Obtener datos en paralelo
  const [totalPolicies, recentPolicies] = await Promise.all([
    countOrgStandalonePolicies(orgId),
    getOrgStandalonePolicies(orgId, { take: 5 }),
  ]);

  // Calcular métricas adicionales
  const highConfidence = recentPolicies.filter(
    (p) => Number(p.overallConfidence) >= 0.8
  ).length;
  const pendingReview = recentPolicies.filter(
    (p) => Number(p.overallConfidence) < 0.5
  ).length;
  
  // Calcular subidas recientes (últimos 7 días)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentUploads = recentPolicies.filter(
    (p) => new Date(p.extractedAt) > sevenDaysAgo
  ).length;

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <PolicyMetrics
        totalPolicies={totalPolicies}
        highConfidence={highConfidence}
        pendingReview={pendingReview}
        recentUploads={recentUploads}
        t={t}
      />

      {/* Acciones Rápidas */}
      <QuickActions locale={locale} t={t} />

      {/* Pólizas Recientes */}
      <RecentPoliciesList policies={recentPolicies} locale={locale} t={t} />
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default async function PoliciesPage({
  params,
}: {
  params: { locale: string };
}) {
  const awaitedParams = await params;
  const locale = awaitedParams.locale as Locale;
  const t = await getTranslations('policies');

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          {t('title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Content */}
      <Suspense fallback={<PoliciesDashboardSkeleton />}>
        <PoliciesDashboardContent locale={locale} />
      </Suspense>
    </div>
  );
}

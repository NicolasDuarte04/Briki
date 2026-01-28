// src/app/[locale]/(app)/policies/overview/page.tsx
/**
 * Página de Métricas y Estadísticas de Pólizas
 * 
 * Muestra análisis detallado de las pólizas de la organización:
 * - Distribución por tipo de cobertura
 * - Confianza de extracción
 * - Tendencias temporales REALES por mes
 * - Valor total asegurado
 */

import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { getOrgStandalonePolicies, countOrgStandalonePolicies } from '@/lib/helpers/getOrgPoliciesContainer';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  DollarSign, 
  Shield,
  Calendar,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import Link from 'next/link';
import type { Locale } from '@/lib/routes/workspace';
import { pathForPolicies } from '@/lib/routes/workspace';

// Componentes de gráficas con ApexCharts
import { MonthlyActivityChart, ConfidenceGauge, DistributionChart } from '@/components/Policies/charts';

export const dynamic = 'force-dynamic';

// ============================================================================
// HELPER: Safely extract string from potentially nested object
// ============================================================================

function safeString(value: any, fallback: string = 'No disponible'): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value || fallback;
  }
  if (typeof value === 'object') {
    if (value.name) return String(value.name);
    if (value.value) return String(value.value);
    if (value.text) return String(value.text);
    const firstValue = Object.values(value).find(v => typeof v === 'string' && v.length > 0);
    if (firstValue) return String(firstValue);
    try {
      const json = JSON.stringify(value);
      return json.length > 50 ? json.substring(0, 47) + '...' : json;
    } catch {
      return fallback;
    }
  }
  return String(value);
}

// ============================================================================
// HELPER: Get month names with translations
// ============================================================================

const MONTH_KEYS_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
const MONTH_KEYS_FULL = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'] as const;

function getMonthNameShort(monthIndex: number, monthsShort: Record<string, string>): string {
  const key = MONTH_KEYS_SHORT[monthIndex];
  return key ? monthsShort[key] || '' : '';
}

function getMonthNameFull(monthIndex: number, monthsFull: Record<string, string>): string {
  const key = MONTH_KEYS_FULL[monthIndex];
  return key ? monthsFull[key] || '' : '';
}

// ============================================================================
// SKELETON
// ============================================================================

function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent>
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// STAT CARD WITH TREND
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
}

function StatCard({ title, value, icon: Icon, color, bgColor, subtitle, trend }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
                <span className="text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// OVERVIEW CONTENT
// ============================================================================

interface OverviewTranslations {
  stats: {
    totalPolicies: string;
    thisMonth: string;
    vsPreviousMonth: string;
    insuredValue: string;
    approximateSum: string;
    insurers: string;
  };
  charts: {
    monthlyActivity: string;
    policiesAnalyzed: string;
    inMonth: string;
    policiesInMonth: string;
    extractionConfidence: string;
    aiAnalysisPrecision: string;
    averageConfidence: string;
    excellent: string;
    acceptable: string;
    needsReview: string;
    high: string;
    medium: string;
    low: string;
    byCoverageType: string;
    coverageDistribution: string;
    byInsurer: string;
    insurerDistribution: string;
    policies: string;
    loadingChart: string;
  };
  months: {
    short: Record<string, string>;
    full: Record<string, string>;
  };
}

async function OverviewContent({ locale, translations }: { locale: Locale; translations: OverviewTranslations }) {
  const { currentOrg } = await getCurrentOrg();
  const orgId = currentOrg.id;

  const [totalPolicies, policies] = await Promise.all([
    countOrgStandalonePolicies(orgId),
    getOrgStandalonePolicies(orgId, { take: 500 }),
  ]);

  // Calcular estadísticas
  let totalInsuredValue = 0;
  const confidenceBuckets = { high: 0, medium: 0, low: 0 };
  const coverageTypes: Record<string, number> = {};
  const insurers: Record<string, number> = {};
  const monthlyData: Record<string, number> = {};

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  policies.forEach((policy) => {
    const data = policy.extractedData as any;
    const confidence = Number(policy.overallConfidence);

    // Confianza
    if (confidence >= 0.8) confidenceBuckets.high++;
    else if (confidence >= 0.5) confidenceBuckets.medium++;
    else confidenceBuckets.low++;

    // Valor asegurado
    if (data?.sum_insured) {
      const sumStr = safeString(data.sum_insured, '0');
      const value = parseFloat(sumStr.replace(/[^0-9.]/g, ''));
      if (!isNaN(value)) totalInsuredValue += value;
    }

    // Tipo de cobertura
    const coverageType = safeString(data?.policy_type || data?.insurance_type, 'No especificado');
    coverageTypes[coverageType] = (coverageTypes[coverageType] || 0) + 1;

    // Aseguradora
    const insurer = safeString(data?.insurer, 'No especificada');
    insurers[insurer] = (insurers[insurer] || 0) + 1;

    // Datos mensuales - usando la fecha de extracción
    const extractedDate = new Date(policy.extractedAt);
    const monthKey = `${extractedDate.getFullYear()}-${String(extractedDate.getMonth()).padStart(2, '0')}`;
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
  });

  // Preparar datos de los últimos 6 meses
  const last6Months: { month: string; count: number; year: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
    last6Months.push({
      month: getMonthNameShort(date.getMonth(), translations.months.short),
      year: date.getFullYear(),
      count: monthlyData[monthKey] || 0,
    });
  }

  // Pólizas del mes actual y anterior
  const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth()).padStart(2, '0')}`;
  
  const currentMonthCount = monthlyData[currentMonthKey] || 0;
  const previousMonthCount = monthlyData[prevMonthKey] || 0;

  // Trend para el mes
  const monthTrend = previousMonthCount > 0 
    ? Math.round(((currentMonthCount - previousMonthCount) / previousMonthCount) * 100)
    : currentMonthCount > 0 ? 100 : 0;

  // Preparar datos de distribución para los charts
  const coverageDistribution = Object.entries(coverageTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({
      label,
      value,
      percentage: totalPolicies > 0 ? (value / totalPolicies) * 100 : 0,
    }));

  const insurerDistribution = Object.entries(insurers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({
      label,
      value,
      percentage: totalPolicies > 0 ? (value / totalPolicies) * 100 : 0,
    }));

  // Formatear valor asegurado
  const formattedInsuredValue = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalInsuredValue);

  // Promedio de confianza
  const avgConfidence = policies.length > 0
    ? (policies.reduce((sum, p) => sum + Number(p.overallConfidence), 0) / policies.length) * 100
    : 0;

  // Get current and previous month names
  const currentMonthName = getMonthNameFull(currentMonth, translations.months.full);
  const previousMonthName = getMonthNameFull((currentMonth - 1 + 12) % 12, translations.months.full);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={translations.stats.totalPolicies}
          value={totalPolicies}
          icon={Shield}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <StatCard
          title={translations.stats.thisMonth}
          value={currentMonthCount}
          icon={Calendar}
          color="text-green-500"
          bgColor="bg-green-500/10"
          subtitle={currentMonthName}
          trend={{
            value: monthTrend,
            isPositive: monthTrend >= 0,
            label: translations.stats.vsPreviousMonth
          }}
        />
        <StatCard
          title={translations.stats.insuredValue}
          value={formattedInsuredValue}
          icon={DollarSign}
          color="text-emerald-500"
          bgColor="bg-emerald-500/10"
          subtitle={translations.stats.approximateSum}
        />
        <StatCard
          title={translations.stats.insurers}
          value={Object.keys(insurers).length}
          icon={Users}
          color="text-purple-500"
          bgColor="bg-purple-500/10"
        />
      </div>

      {/* Charts Row 1: Monthly Activity + Confidence Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyActivityChart 
          data={last6Months}
          currentMonthCount={currentMonthCount}
          previousMonthCount={previousMonthCount}
          currentMonthName={currentMonthName}
          previousMonthName={previousMonthName}
          translations={{
            title: translations.charts.monthlyActivity,
            description: translations.charts.policiesAnalyzed,
            inMonth: translations.charts.inMonth,
            policiesInMonth: translations.charts.policiesInMonth,
            vsPreviousMonth: translations.stats.vsPreviousMonth,
            policies: translations.charts.policies,
            loadingChart: translations.charts.loadingChart,
          }}
        />
        
        <ConfidenceGauge
          avgConfidence={avgConfidence}
          highCount={confidenceBuckets.high}
          mediumCount={confidenceBuckets.medium}
          lowCount={confidenceBuckets.low}
          total={totalPolicies}
          translations={{
            title: translations.charts.extractionConfidence,
            description: translations.charts.aiAnalysisPrecision,
            averageConfidence: translations.charts.averageConfidence,
            excellent: translations.charts.excellent,
            acceptable: translations.charts.acceptable,
            needsReview: translations.charts.needsReview,
            high: translations.charts.high,
            medium: translations.charts.medium,
            low: translations.charts.low,
            loadingChart: translations.charts.loadingChart,
          }}
        />
      </div>

      {/* Charts Row 2: Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistributionChart
          title={translations.charts.byCoverageType}
          variant="coverage"
          description={translations.charts.coverageDistribution}
          items={coverageDistribution}
          type="donut"
          loadingText={translations.charts.loadingChart}
        />
        
        <DistributionChart
          title={translations.charts.byInsurer}
          variant="insurer"
          description={translations.charts.insurerDistribution}
          items={insurerDistribution}
          type="donut"
          colors={["#10b981", "#f97316", "#14b8a6", "#f43f5e", "#a855f7", "#6366f1"]}
          loadingText={translations.charts.loadingChart}
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default async function PoliciesOverviewPage({
  params,
}: {
  params: { locale: string };
}) {
  const awaitedParams = await params;
  const locale = awaitedParams.locale as Locale;
  const t = await getTranslations('policies');

  const translations: OverviewTranslations = {
    stats: {
      totalPolicies: t('overviewPage.stats.totalPolicies'),
      thisMonth: t('overviewPage.stats.thisMonth'),
      vsPreviousMonth: t('overviewPage.stats.vsPreviousMonth'),
      insuredValue: t('overviewPage.stats.insuredValue'),
      approximateSum: t('overviewPage.stats.approximateSum'),
      insurers: t('overviewPage.stats.insurers'),
    },
    charts: {
      monthlyActivity: t('overviewPage.charts.monthlyActivity'),
      policiesAnalyzed: t('overviewPage.charts.policiesAnalyzed'),
      inMonth: t('overviewPage.charts.inMonth'),
      policiesInMonth: t('overviewPage.charts.policiesInMonth'),
      extractionConfidence: t('overviewPage.charts.extractionConfidence'),
      aiAnalysisPrecision: t('overviewPage.charts.aiAnalysisPrecision'),
      averageConfidence: t('overviewPage.charts.averageConfidence'),
      excellent: t('overviewPage.charts.excellent'),
      acceptable: t('overviewPage.charts.acceptable'),
      needsReview: t('overviewPage.charts.needsReview'),
      high: t('overviewPage.charts.high'),
      medium: t('overviewPage.charts.medium'),
      low: t('overviewPage.charts.low'),
      byCoverageType: t('overviewPage.charts.byCoverageType'),
      coverageDistribution: t('overviewPage.charts.coverageDistribution'),
      byInsurer: t('overviewPage.charts.byInsurer'),
      insurerDistribution: t('overviewPage.charts.insurerDistribution'),
      policies: t('overviewPage.charts.policies'),
      loadingChart: t('overviewPage.charts.loadingChart'),
    },
    months: {
      short: {
        jan: t('overviewPage.months.short.jan'),
        feb: t('overviewPage.months.short.feb'),
        mar: t('overviewPage.months.short.mar'),
        apr: t('overviewPage.months.short.apr'),
        may: t('overviewPage.months.short.may'),
        jun: t('overviewPage.months.short.jun'),
        jul: t('overviewPage.months.short.jul'),
        aug: t('overviewPage.months.short.aug'),
        sep: t('overviewPage.months.short.sep'),
        oct: t('overviewPage.months.short.oct'),
        nov: t('overviewPage.months.short.nov'),
        dec: t('overviewPage.months.short.dec'),
      },
      full: {
        january: t('overviewPage.months.full.january'),
        february: t('overviewPage.months.full.february'),
        march: t('overviewPage.months.full.march'),
        april: t('overviewPage.months.full.april'),
        may: t('overviewPage.months.full.may'),
        june: t('overviewPage.months.full.june'),
        july: t('overviewPage.months.full.july'),
        august: t('overviewPage.months.full.august'),
        september: t('overviewPage.months.full.september'),
        october: t('overviewPage.months.full.october'),
        november: t('overviewPage.months.full.november'),
        december: t('overviewPage.months.full.december'),
      },
    },
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      {/* Header with Back Button */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={pathForPolicies(locale)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('overviewPage.backToPolicies')}
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          {t('overviewPage.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('overviewPage.subtitle')}
        </p>
      </div>

      {/* Content */}
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent locale={locale} translations={translations} />
      </Suspense>
    </div>
  );
}

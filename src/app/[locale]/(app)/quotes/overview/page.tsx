// src/app/[locale]/(app)/quotes/overview/page.tsx
/**
 * Página de Métricas y Estadísticas de Cotizaciones
 * 
 * Muestra análisis detallado de las cotizaciones de la organización:
 * - Distribución por aseguradora
 * - Estado de validez (vigentes vs vencidas)
 * - Tendencias temporales por mes
 * - Valor total cotizado
 */

import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { getOrgStandaloneQuotes, countOrgStandaloneQuotes } from '@/lib/helpers/getOrgQuotesContainer';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  DollarSign, 
  Receipt,
  Calendar,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import type { Locale } from '@/lib/routes/workspace';
import { pathForQuotes } from '@/lib/routes/workspace';

// Componentes de gráficas reutilizados de Policies
import { MonthlyActivityChart, ConfidenceGauge, DistributionChart } from '@/components/Policies/charts';

export const dynamic = 'force-dynamic';

// ============================================================================
// HELPER: Safely extract string from potentially nested object
// ============================================================================

function safeString(value: unknown, fallback: string = 'No disponible'): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value || fallback;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.name) return String(obj.name);
    if (obj.value) return String(obj.value);
    if (obj.text) return String(obj.text);
    const firstValue = Object.values(obj).find(v => typeof v === 'string' && (v as string).length > 0);
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
// HELPER: Check if a date is expired
// ============================================================================

function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    return new Date(dateStr) < new Date();
  } catch {
    return false;
  }
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
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-4" />
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
// VALIDITY STAT CARD
// ============================================================================

interface ValidityStatCardProps {
  validCount: number;
  expiredCount: number;
  total: number;
  translations: {
    title: string;
    valid: string;
    expired: string;
  };
}

function ValidityStatCard({ validCount, expiredCount, total, translations }: ValidityStatCardProps) {
  const validPercent = total > 0 ? Math.round((validCount / total) * 100) : 0;
  
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{translations.title}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">{validCount} {translations.valid}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-500" />
                <span className="text-sm">{expiredCount} {translations.expired}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{validPercent}% vigentes</p>
          </div>
          <div className="p-3 rounded-full bg-blue-500/10">
            <Calendar className="h-5 w-5 text-blue-500" />
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
    totalQuotes: string;
    thisMonth: string;
    vsPreviousMonth: string;
    quotedValue: string;
    approximateSum: string;
    insurers: string;
    validityStatus: string;
    valid: string;
    expired: string;
  };
  charts: {
    monthlyActivity: string;
    quotesAnalyzed: string;
    inMonth: string;
    quotesInMonth: string;
    extractionConfidence: string;
    aiAnalysisPrecision: string;
    averageConfidence: string;
    excellent: string;
    acceptable: string;
    needsReview: string;
    high: string;
    medium: string;
    low: string;
    byBranchType: string;
    branchDistribution: string;
    byInsurer: string;
    insurerDistribution: string;
    quotes: string;
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

  const [totalQuotes, quotes] = await Promise.all([
    countOrgStandaloneQuotes(orgId),
    getOrgStandaloneQuotes(orgId, { take: 500 }),
  ]);

  // Calcular estadísticas
  let totalQuotedValue = 0;
  let validCount = 0;
  let expiredCount = 0;
  const confidenceBuckets = { high: 0, medium: 0, low: 0 };
  const branchTypes: Record<string, number> = {};
  const insurers: Record<string, number> = {};
  const monthlyData: Record<string, number> = {};

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  quotes.forEach((quote: any) => {
    const confidence = Number(quote.confidence ?? 0);

    // Confianza
    if (confidence >= 0.8) confidenceBuckets.high++;
    else if (confidence >= 0.5) confidenceBuckets.medium++;
    else confidenceBuckets.low++;

    // Validez
    if (quote.validUntil) {
      if (isExpired(quote.validUntil)) {
        expiredCount++;
      } else {
        validCount++;
      }
    }

    // Valor cotizado
    if (quote.quotedPremium) {
      const value = parseFloat(String(quote.quotedPremium).replace(/[^0-9.]/g, ''));
      if (!isNaN(value)) totalQuotedValue += value;
    }

    // Tipo de ramo/producto
    const branchType = safeString(quote.branchType || quote.product, 'No especificado');
    branchTypes[branchType] = (branchTypes[branchType] || 0) + 1;

    // Aseguradora
    const insurer = safeString(quote.insurer, 'No especificada');
    insurers[insurer] = (insurers[insurer] || 0) + 1;

    // Datos mensuales - usando la fecha de análisis
    const analyzedDate = new Date(quote.analyzedAt ?? quote.createdAt);
    const monthKey = `${analyzedDate.getFullYear()}-${String(analyzedDate.getMonth()).padStart(2, '0')}`;
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

  // Cotizaciones del mes actual y anterior
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
  const branchDistribution = Object.entries(branchTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({
      label,
      value,
      percentage: totalQuotes > 0 ? (value / totalQuotes) * 100 : 0,
    }));

  const insurerDistribution = Object.entries(insurers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({
      label,
      value,
      percentage: totalQuotes > 0 ? (value / totalQuotes) * 100 : 0,
    }));

  // Formatear valor cotizado
  const formattedQuotedValue = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalQuotedValue);

  // Promedio de confianza
  const avgConfidence = quotes.length > 0
    ? (quotes.reduce((sum: number, q: any) => sum + Number(q.confidence ?? 0), 0) / quotes.length) * 100
    : 0;

  // Get current and previous month names
  const currentMonthName = getMonthNameFull(currentMonth, translations.months.full);
  const previousMonthName = getMonthNameFull((currentMonth - 1 + 12) % 12, translations.months.full);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={translations.stats.totalQuotes}
          value={totalQuotes}
          icon={Receipt}
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
          title={translations.stats.quotedValue}
          value={formattedQuotedValue}
          icon={DollarSign}
          color="text-emerald-500"
          bgColor="bg-emerald-500/10"
          subtitle={translations.stats.approximateSum}
        />
        <ValidityStatCard
          validCount={validCount}
          expiredCount={expiredCount}
          total={totalQuotes}
          translations={{
            title: translations.stats.validityStatus,
            valid: translations.stats.valid,
            expired: translations.stats.expired,
          }}
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
            description: translations.charts.quotesAnalyzed,
            inMonth: translations.charts.inMonth,
            policiesInMonth: translations.charts.quotesInMonth,
            vsPreviousMonth: translations.stats.vsPreviousMonth,
            policies: translations.charts.quotes,
            loadingChart: translations.charts.loadingChart,
          }}
        />
        
        <ConfidenceGauge
          avgConfidence={avgConfidence}
          highCount={confidenceBuckets.high}
          mediumCount={confidenceBuckets.medium}
          lowCount={confidenceBuckets.low}
          total={totalQuotes}
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
          title={translations.charts.byBranchType}
          variant="coverage"
          description={translations.charts.branchDistribution}
          items={branchDistribution}
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

export default async function QuotesOverviewPage({
  params,
}: {
  params: { locale: string };
}) {
  const awaitedParams = await params;
  const locale = awaitedParams.locale as Locale;
  const t = await getTranslations('quotes');

  const translations: OverviewTranslations = {
    stats: {
      totalQuotes: t('overviewPage.stats.totalQuotes'),
      thisMonth: t('overviewPage.stats.thisMonth'),
      vsPreviousMonth: t('overviewPage.stats.vsPreviousMonth'),
      quotedValue: t('overviewPage.stats.quotedValue'),
      approximateSum: t('overviewPage.stats.approximateSum'),
      insurers: t('overviewPage.stats.insurers'),
      validityStatus: t('overviewPage.stats.validityStatus'),
      valid: t('overviewPage.stats.valid'),
      expired: t('overviewPage.stats.expired'),
    },
    charts: {
      monthlyActivity: t('overviewPage.charts.monthlyActivity'),
      quotesAnalyzed: t('overviewPage.charts.quotesAnalyzed'),
      inMonth: t('overviewPage.charts.inMonth'),
      quotesInMonth: t('overviewPage.charts.quotesInMonth'),
      extractionConfidence: t('overviewPage.charts.extractionConfidence'),
      aiAnalysisPrecision: t('overviewPage.charts.aiAnalysisPrecision'),
      averageConfidence: t('overviewPage.charts.averageConfidence'),
      excellent: t('overviewPage.charts.excellent'),
      acceptable: t('overviewPage.charts.acceptable'),
      needsReview: t('overviewPage.charts.needsReview'),
      high: t('overviewPage.charts.high'),
      medium: t('overviewPage.charts.medium'),
      low: t('overviewPage.charts.low'),
      byBranchType: t('overviewPage.charts.byBranchType'),
      branchDistribution: t('overviewPage.charts.branchDistribution'),
      byInsurer: t('overviewPage.charts.byInsurer'),
      insurerDistribution: t('overviewPage.charts.insurerDistribution'),
      quotes: t('overviewPage.charts.quotes'),
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
          <Link href={pathForQuotes(locale)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('overviewPage.backToQuotes')}
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

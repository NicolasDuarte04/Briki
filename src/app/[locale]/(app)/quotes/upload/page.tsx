// src/app/[locale]/(app)/quotes/upload/page.tsx
/**
 * Página de Subida de Cotizaciones Standalone
 * 
 * Permite subir cotizaciones PDF directamente a la organización,
 * sin necesidad de asociarlas a un caso específico.
 */

import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Upload, 
  Receipt, 
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import type { Locale } from '@/lib/routes/workspace';
import { pathForQuotes, pathForQuotesAnalysis } from '@/lib/routes/workspace';
import { QuoteUploadForm } from '@/components/Quotes/QuoteUploadForm';

export const dynamic = 'force-dynamic';

// ============================================================================
// SKELETON
// ============================================================================

function UploadSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// INFO CARDS
// ============================================================================

interface SupportedFormatsCardProps {
  t: (key: string) => string;
}

function SupportedFormatsCard({ t }: SupportedFormatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          {t('uploadPage.supportedFormats')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-amber-600" />
            <span>{t('uploadPage.pdfRecommended')}</span>
          </li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          {t('uploadPage.formatTip')}
        </p>
      </CardContent>
    </Card>
  );
}

interface TipsCardProps {
  t: (key: string) => string;
}

function TipsCard({ t }: TipsCardProps) {
  const tips = [
    t('uploadPage.tip1'),
    t('uploadPage.tip2'),
    t('uploadPage.tip3'),
    t('uploadPage.tip4'),
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          {t('uploadPage.tipsTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CONTENT
// ============================================================================

async function UploadContent({ locale }: { locale: Locale }) {
  const t = await getTranslations('quotes');
  const { user, currentOrg } = await getCurrentOrg();

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Upload Form */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t('uploadPage.uploadTitle')}
            </CardTitle>
            <CardDescription>
              {t('uploadPage.uploadDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuoteUploadForm
              orgId={currentOrg.id}
              userId={user.id}
              locale={locale}
              redirectUrl={pathForQuotesAnalysis(locale)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <SupportedFormatsCard t={t} />
        <TipsCard t={t} />
      </div>
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function QuotesUploadPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('quotes');

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={pathForQuotes(locale)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('uploadPage.backToQuotes')}
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          {t('uploadPage.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('uploadPage.subtitle')}
        </p>
      </div>

      {/* Content */}
      <Suspense fallback={<UploadSkeleton />}>
        <UploadContent locale={locale} />
      </Suspense>
    </div>
  );
}

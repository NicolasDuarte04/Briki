// src/app/[locale]/(app)/policies/upload/page.tsx
/**
 * Página de Subida de Pólizas Standalone
 * 
 * Permite subir pólizas PDF directamente a la organización,
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
  FileText, 
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import type { Locale } from '@/lib/routes/workspace';
import { pathForPolicies, pathForPoliciesAnalysis } from '@/lib/routes/workspace';
import { PolicyUploadForm } from '@/components/Policies/PolicyUploadForm';

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
  t: {
    supportedFormats: string;
    pdfRecommended: string;
    formatTip: string;
  };
}

function SupportedFormatsCard({ t }: SupportedFormatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          {t.supportedFormats}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-500" />
            <span>{t.pdfRecommended}</span>
          </li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          {t.formatTip}
        </p>
      </CardContent>
    </Card>
  );
}

interface TipsCardProps {
  t: {
    title: string;
    tips: string[];
  };
}

function TipsCard({ t }: TipsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {t.tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span className="text-green-500 mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

interface LimitationsCardProps {
  t: {
    title: string;
    maxFileSize: string;
    scannedPdf: string;
    manualReview: string;
  };
}

function LimitationsCard({ t }: LimitationsCardProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            <span>{t.maxFileSize}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            <span>{t.scannedPdf}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            <span>{t.manualReview}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// UPLOAD CONTENT
// ============================================================================

interface TranslationProps {
  supportedFormats: {
    supportedFormats: string;
    pdfRecommended: string;
    formatTip: string;
  };
  tips: {
    title: string;
    tips: string[];
  };
  limitations: {
    title: string;
    maxFileSize: string;
    scannedPdf: string;
    manualReview: string;
  };
  card: {
    title: string;
    description: string;
  };
}

async function UploadContent({ locale, translations }: { locale: Locale; translations: TranslationProps }) {
  const { currentOrg, user } = await getCurrentOrg();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Upload Area */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {translations.card.title}
            </CardTitle>
            <CardDescription>
              {translations.card.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PolicyUploadForm 
              orgId={currentOrg.id} 
              userId={user.id}
              locale={locale}
              redirectUrl={pathForPoliciesAnalysis(locale)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sidebar Info */}
      <div className="space-y-6">
        <SupportedFormatsCard t={translations.supportedFormats} />
        <TipsCard t={translations.tips} />
        <LimitationsCard t={translations.limitations} />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default async function PoliciesUploadPage({
  params,
}: {
  params: { locale: string };
}) {
  const awaitedParams = await params;
  const locale = awaitedParams.locale as Locale;
  const t = await getTranslations('policies');

  const translations: TranslationProps = {
    supportedFormats: {
      supportedFormats: t('upload.supportedFormats'),
      pdfRecommended: t('upload.pdfRecommended'),
      formatTip: t('upload.formatTip'),
    },
    tips: {
      title: t('upload.tips.title'),
      tips: [
        t('upload.tips.noPassword'),
        t('upload.tips.selectableText'),
        t('upload.tips.multipleFiles'),
        t('upload.tips.analysisTime'),
      ],
    },
    limitations: {
      title: t('uploadPage.limitations.title'),
      maxFileSize: t('uploadPage.limitations.maxFileSize'),
      scannedPdf: t('uploadPage.limitations.scannedPdf'),
      manualReview: t('uploadPage.limitations.manualReview'),
    },
    card: {
      title: t('uploadPage.cardTitle'),
      description: t('uploadPage.cardDescription'),
    },
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      {/* Header with Back Button */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={pathForPolicies(locale)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('uploadPage.backToPolicies')}
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
        <UploadContent locale={locale} translations={translations} />
      </Suspense>
    </div>
  );
}

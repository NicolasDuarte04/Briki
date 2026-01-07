// src/app/[locale]/(app)/policies/upload/page.tsx
/**
 * Página de Subida de Pólizas Standalone
 * 
 * Permite subir pólizas PDF directamente a la organización,
 * sin necesidad de asociarlas a un caso específico.
 */

import { Suspense } from 'react';
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

function SupportedFormatsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          Formatos Soportados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-500" />
            <span>PDF (Recomendado)</span>
          </li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Para mejores resultados, sube documentos PDF con texto seleccionable 
          (no escaneados como imagen).
        </p>
      </CardContent>
    </Card>
  );
}

function TipsCard() {
  const tips = [
    'Asegúrate de que el PDF no esté protegido con contraseña',
    'Los documentos con texto seleccionable dan mejores resultados',
    'Puedes subir múltiples pólizas a la vez',
    'El análisis puede tomar hasta 30 segundos por póliza',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Tips para Mejores Resultados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {tips.map((tip, index) => (
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

function LimitationsCard() {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Limitaciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            <span>Tamaño máximo: 10MB por archivo</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            <span>PDFs escaneados pueden tener menor precisión</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            <span>Algunos formatos de póliza pueden requerir revisión manual</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// UPLOAD CONTENT
// ============================================================================

async function UploadContent({ locale }: { locale: Locale }) {
  const { currentOrg, user } = await getCurrentOrg();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Upload Area */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Subir Póliza PDF
            </CardTitle>
            <CardDescription>
              Arrastra y suelta un archivo PDF o haz clic para seleccionar. 
              Nuestro sistema analizará automáticamente el documento.
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
        <SupportedFormatsCard />
        <TipsCard />
        <LimitationsCard />
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

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      {/* Header with Back Button */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={pathForPolicies(locale)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Pólizas
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Subir Nueva Póliza
        </h1>
        <p className="text-muted-foreground mt-1">
          Sube un documento PDF para analizarlo automáticamente
        </p>
      </div>

      {/* Content */}
      <Suspense fallback={<UploadSkeleton />}>
        <UploadContent locale={locale} />
      </Suspense>
    </div>
  );
}

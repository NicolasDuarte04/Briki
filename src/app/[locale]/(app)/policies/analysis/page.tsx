// src/app/[locale]/(app)/policies/analysis/page.tsx
/**
 * Página de Análisis Detallado de Pólizas
 * 
 * Muestra la lista completa de pólizas analizadas con:
 * - Detalles completos de cada póliza
 * - Visualización de confianza por campo
 * - Datos estructurados extraídos
 * - Referencias a páginas del PDF
 */

import { Suspense } from 'react';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { getOrgStandalonePolicies, countOrgStandalonePolicies } from '@/lib/helpers/getOrgPoliciesContainer';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Search, 
  FileText, 
  Calendar,
  Building2,
  Shield,
  DollarSign,
  ChevronRight,
  ChevronDown,
  Download,
  Eye,
  Filter,
  User,
  MapPin,
  Phone,
  Mail,
  Hash,
  Clock,
  AlertCircle,
  CheckCircle2,
  Info,
  FileCheck,
} from 'lucide-react';
import Link from 'next/link';
import type { Locale } from '@/lib/routes/workspace';
import { pathForPolicies, pathForPoliciesUpload } from '@/lib/routes/workspace';

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

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'No disponible';
  try {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// ============================================================================
// SKELETON
// ============================================================================

function AnalysisSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-72" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CONFIDENCE BADGE
// ============================================================================

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = confidence * 100;
  
  if (percentage >= 80) {
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {percentage.toFixed(0)}%
      </Badge>
    );
  }
  if (percentage >= 50) {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        {percentage.toFixed(0)}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
      <Info className="h-3 w-3 mr-1" />
      {percentage.toFixed(0)}%
    </Badge>
  );
}

// ============================================================================
// DATA FIELD COMPONENT
// ============================================================================

interface DataFieldProps {
  icon: React.ElementType;
  label: string;
  value: string;
  confidence?: number;
}

function DataField({ icon: Icon, label, value, confidence }: DataFieldProps) {
  const isEmpty = !value || value === 'No disponible';
  
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${isEmpty ? 'bg-muted/30' : 'bg-muted/50'}`}>
      <div className={`p-2 rounded-md ${isEmpty ? 'bg-muted' : 'bg-primary/10'}`}>
        <Icon className={`h-4 w-4 ${isEmpty ? 'text-muted-foreground' : 'text-primary'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className={`text-sm font-medium ${isEmpty ? 'text-muted-foreground' : ''}`}>
          {value}
        </p>
      </div>
      {confidence !== undefined && !isEmpty && (
        <div className="text-right">
          <div className={`text-xs px-1.5 py-0.5 rounded ${
            confidence >= 0.8 ? 'bg-green-100 text-green-700' :
            confidence >= 0.5 ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {(confidence * 100).toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPANDED POLICY CARD
// ============================================================================

interface PolicyDetailCardProps {
  policy: any;
  locale: Locale;
}

function PolicyDetailCard({ policy, locale }: PolicyDetailCardProps) {
  const extractedData = policy.extractedData as any;
  const confidence = Number(policy.overallConfidence);
  
  // Extraer todos los datos disponibles
  const policyNumber = safeString(extractedData?.policy_number);
  const insurer = safeString(extractedData?.insurer);
  const policyType = safeString(extractedData?.policy_type || extractedData?.insurance_type);
  const sumInsured = safeString(extractedData?.sum_insured);
  const premium = safeString(extractedData?.premium);
  const startDate = extractedData?.start_date || extractedData?.effective_date;
  const endDate = extractedData?.end_date || extractedData?.expiry_date;
  
  // Datos del asegurado
  const insuredName = safeString(extractedData?.insured_name || extractedData?.policyholder?.name);
  const insuredAddress = safeString(extractedData?.insured_address || extractedData?.policyholder?.address);
  const insuredId = safeString(extractedData?.insured_id || extractedData?.policyholder?.id);
  
  // Coberturas
  const coverages = extractedData?.coverages || extractedData?.coverage_details || [];
  const exclusions = extractedData?.exclusions || [];
  const deductible = safeString(extractedData?.deductible);
  
  // Referencias de página
  const pageRefs = policy.pageReferences || [];

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <CardHeader className="bg-muted/30 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">
                {policy.artifact?.fileName || 'Póliza sin nombre'}
              </CardTitle>
              <CardDescription className="mt-1">
                Póliza #{policyNumber} • Analizada el {formatDate(policy.extractedAt)}
              </CardDescription>
            </div>
          </div>
          <ConfidenceBadge confidence={confidence} />
        </div>
        
        {/* Confidence bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Confianza del análisis</span>
            <span>{(confidence * 100).toFixed(1)}%</span>
          </div>
          <Progress value={confidence * 100} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Información Principal */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Información de la Póliza
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <DataField icon={Hash} label="Número de Póliza" value={policyNumber} />
            <DataField icon={Building2} label="Aseguradora" value={insurer} />
            <DataField icon={Shield} label="Tipo de Seguro" value={policyType} />
            <DataField icon={DollarSign} label="Suma Asegurada" value={sumInsured} />
            <DataField icon={DollarSign} label="Prima" value={premium} />
            <DataField icon={DollarSign} label="Deducible" value={deductible} />
          </div>
        </div>

        <Separator />

        {/* Vigencia */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Vigencia
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DataField icon={Calendar} label="Fecha de Inicio" value={formatDate(startDate)} />
            <DataField icon={Calendar} label="Fecha de Vencimiento" value={formatDate(endDate)} />
          </div>
        </div>

        <Separator />

        {/* Datos del Asegurado */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <User className="h-4 w-4" />
            Datos del Asegurado
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <DataField icon={User} label="Nombre/Razón Social" value={insuredName} />
            <DataField icon={Hash} label="Identificación" value={insuredId} />
            <DataField icon={MapPin} label="Dirección" value={insuredAddress} />
          </div>
        </div>

        {/* Coberturas (si existen) */}
        {Array.isArray(coverages) && coverages.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Coberturas ({coverages.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {coverages.slice(0, 6).map((coverage: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded-md text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="text-green-800">
                      {typeof coverage === 'string' ? coverage : safeString(coverage)}
                    </span>
                  </div>
                ))}
                {coverages.length > 6 && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    +{coverages.length - 6} más
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Exclusiones (si existen) */}
        {Array.isArray(exclusions) && exclusions.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Exclusiones ({exclusions.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {exclusions.slice(0, 4).map((exclusion: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded-md text-sm">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span className="text-red-800">
                      {typeof exclusion === 'string' ? exclusion : safeString(exclusion)}
                    </span>
                  </div>
                ))}
                {exclusions.length > 4 && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    +{exclusions.length - 4} más
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Referencias de Página (si existen) */}
        {pageRefs.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Referencias en el Documento ({pageRefs.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {pageRefs.slice(0, 10).map((ref: any, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {ref.fieldName}: Pág. {ref.pageNumber}
                  </Badge>
                ))}
                {pageRefs.length > 10 && (
                  <Badge variant="outline" className="text-xs">
                    +{pageRefs.length - 10} más
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <Separator />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Ver PDF Original
          </Button>
          {policy.artifact?.fileId && (
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ locale }: { locale: Locale }) {
  return (
    <Card>
      <CardContent className="py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No hay pólizas analizadas</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Sube tu primera póliza PDF para que nuestro sistema la analice 
            y extraiga automáticamente la información relevante.
          </p>
          <Button asChild>
            <Link href={pathForPoliciesUpload(locale)}>
              Subir Primera Póliza
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ANALYSIS CONTENT
// ============================================================================

async function AnalysisContent({ locale }: { locale: Locale }) {
  const { currentOrg } = await getCurrentOrg();
  const orgId = currentOrg.id;

  const [totalPolicies, policies] = await Promise.all([
    countOrgStandalonePolicies(orgId),
    getOrgStandalonePolicies(orgId, { take: 20 }),
  ]);

  if (policies.length === 0) {
    return <EmptyState locale={locale} />;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por número de póliza, aseguradora..." 
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {policies.length} de {totalPolicies} pólizas
        </p>
      </div>

      {/* Policy List - Detailed Cards */}
      <div className="space-y-6">
        {policies.map((policy) => (
          <PolicyDetailCard key={policy.id} policy={policy} locale={locale} />
        ))}
      </div>

      {/* Load More */}
      {policies.length < totalPolicies && (
        <div className="flex justify-center">
          <Button variant="outline">
            Cargar más pólizas
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              Análisis de Pólizas
            </h1>
            <p className="text-muted-foreground mt-1">
              Explora los detalles extraídos de cada póliza
            </p>
          </div>
          <Button asChild>
            <Link href={pathForPoliciesUpload(locale)}>
              Subir Nueva Póliza
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

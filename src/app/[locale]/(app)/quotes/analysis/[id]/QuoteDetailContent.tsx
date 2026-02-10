// /src/app/[locale]/(app)/quotes/analysis/[id]/QuoteDetailContent.tsx
/**
 * Contenido de detalle de cotización (Client Component)
 * 
 * Muestra información completa de una cotización:
 * - Header con navegación, pin y eliminación
 * - Información general de la cotización
 * - Vigencia y validez de la oferta
 * - Datos del cotizante/prospecto
 * - Coberturas ofrecidas
 * - Vínculos a casos
 * - Acciones (ver PDF, descargar)
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PinButton } from '@/components/Workspace/PinButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  Trash2,
  Receipt, 
  Calendar,
  Building2,
  Package,
  DollarSign,
  Download,
  Eye,
  User,
  Clock,
  Hash,
  CheckCircle2,
  AlertCircle,
  Info,
  Link as LinkIcon,
  ExternalLink,
  FileText,
  Shield,
} from 'lucide-react';
import { pathForQuotesAnalysis, type Locale } from '@/lib/routes/workspace';

// ============================================================================
// TYPES
// ============================================================================

interface QuoteDetailContentProps {
  quote: {
    id: string;
    artifactId: string;
    insurer: string | null;
    product: string | null;
    branchType: string | null;
    quoteNumber: string | null;
    quoteDate: string | null;
    validUntil: string | null;
    quotedPremium: number | null;
    netPremium: number | null;
    taxes?: number | null;
    fees?: number | null;
    currency: string | null;
    paymentFrequency: string | null;
    effectiveDate: string | null;
    expirationDate: string | null;
    durationMonths?: number | null;
    prospectName: string | null;
    prospectId: string | null;
    prospectCompany?: string | null;
    insuredObjectType: string | null;
    insuredObjectDescription: string | null;
    insuredValue: number | null;
    insuredLocation?: string | null;
    extractedData: Record<string, unknown> | null;
    status: string | null;
    confidence: number | null;
    extractionMethod: string | null;
    analyzedAt: string | null;
    createdAt: string;
    updatedAt: string;
    artifact: {
      id: string;
      fileName: string | null;
      contentType: string | null;
      fileId: string | null;
      createdAt: string;
    } | null;
    pageReferences: Array<{
      id: string;
      fieldName: string;
      fieldValue: string | null;
      pageNumber: number;
      boundingBox: unknown;
      confidence: number | null;
    }>;
    caseLinks: Array<{
      id: string;
      caseId: string;
      linkedAt: string;
      status: string;
      case: {
        id: string;
        title: string | null;
        clientName: string | null;
        status: string | null;
      } | null;
    }>;
  };
  isPinned: boolean;
  locale: Locale;
}

// ============================================================================
// HELPERS
// ============================================================================

function safeStringWithFallback(value: unknown, fallback: string): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.name && typeof obj.name === 'string') return obj.name;
    if (obj.value && typeof obj.value === 'string') return obj.value;
  }
  return fallback;
}

function formatDateWithLocale(dateStr: string | null | undefined, fallback: string, locale: string): string {
  if (!dateStr) return fallback;
  try {
    return new Date(dateStr).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(value: number | string | null, currency: string = 'MXN', fallback: string): string {
  if (value === null || value === undefined) return fallback;
  try {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return fallback;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(num);
  } catch {
    return typeof value === 'string' ? value : fallback;
  }
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
// SUB-COMPONENTS
// ============================================================================

function ConfidenceBadge({ confidence, t }: { confidence: number; t: any }) {
  const percentage = confidence * 100;
  
  if (percentage >= 80) {
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {t('confidenceHigh', { percent: percentage.toFixed(0) })}
      </Badge>
    );
  }
  if (percentage >= 50) {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        {t('confidenceMedium', { percent: percentage.toFixed(0) })}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
      <Info className="h-3 w-3 mr-1" />
      {t('confidenceLow', { percent: percentage.toFixed(0) })}
    </Badge>
  );
}

function ValidityBadge({ validUntil, t }: { validUntil: string | null; t: any }) {
  const expired = isExpired(validUntil);
  
  if (!validUntil) {
    return null;
  }
  
  if (expired) {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
        <Clock className="h-3 w-3 mr-1" />
        {t('expired')}
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
      <CheckCircle2 className="h-3 w-3 mr-1" />
      {t('valid')}
    </Badge>
  );
}

interface DataFieldProps {
  icon: React.ElementType;
  label: string;
  value: string;
  notAvailableText: string;
}

function DataField({ icon: Icon, label, value, notAvailableText }: DataFieldProps) {
  const isEmpty = !value || value === notAvailableText;
  
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
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QuoteDetailContent({ quote, isPinned, locale }: QuoteDetailContentProps) {
  const router = useRouter();
  const t = useTranslations('quotes.detailPage');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const notAvailable = t('notAvailable');
  const safeString = (value: unknown) => safeStringWithFallback(value, notAvailable);
  const formatDate = (dateStr: string | null | undefined) => formatDateWithLocale(dateStr, notAvailable, locale);
  
  // Extract data from quote
  const extractedData = quote.extractedData || {};
  const coverages = (extractedData as any).coverages || [];
  const exclusions = (extractedData as any).exclusions || [];
  const specialConditions = (extractedData as any).special_conditions || [];
  
  // Delete handler
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/org-quotes/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactId: quote.artifactId }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar');
      }
      
      router.push(pathForQuotesAnalysis(locale));
      router.refresh();
    } catch (error) {
      console.error('Error deleting quote:', error);
      alert(error instanceof Error ? error.message : 'Error al eliminar la cotización');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // PDF viewer URL
  const pdfViewerUrl = quote.artifact?.fileId 
    ? `/api/pdf-viewer?fileId=${encodeURIComponent(quote.artifact.fileId)}`
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={pathForQuotesAnalysis(locale)}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {safeString(quote.insurer)}
              </h1>
              <ValidityBadge validUntil={quote.validUntil} t={t} />
              {quote.confidence && <ConfidenceBadge confidence={quote.confidence} t={t} />}
            </div>
            <p className="text-muted-foreground">
              {quote.product || quote.branchType || t('quoteDetails')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <PinButton
            entityId={quote.id}
            entityType="quote"
            isPinned={isPinned}
          />
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {t('generalInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              <DataField
                icon={Building2}
                label={t('insurer')}
                value={safeString(quote.insurer)}
                notAvailableText={notAvailable}
              />
              <DataField
                icon={Package}
                label={t('product')}
                value={safeString(quote.product)}
                notAvailableText={notAvailable}
              />
              <DataField
                icon={Hash}
                label={t('quoteNumber')}
                value={safeString(quote.quoteNumber)}
                notAvailableText={notAvailable}
              />
              <DataField
                icon={Shield}
                label={t('branchType')}
                value={safeString(quote.branchType)}
                notAvailableText={notAvailable}
              />
            </CardContent>
          </Card>

          {/* Financial Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t('financialInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              <DataField
                icon={DollarSign}
                label={t('quotedPremium')}
                value={formatCurrency(quote.quotedPremium, quote.currency || 'MXN', notAvailable)}
                notAvailableText={notAvailable}
              />
              <DataField
                icon={DollarSign}
                label={t('netPremium')}
                value={formatCurrency(quote.netPremium, quote.currency || 'MXN', notAvailable)}
                notAvailableText={notAvailable}
              />
              <DataField
                icon={Calendar}
                label={t('paymentFrequency')}
                value={safeString(quote.paymentFrequency)}
                notAvailableText={notAvailable}
              />
              <DataField
                icon={DollarSign}
                label={t('insuredValue')}
                value={formatCurrency(quote.insuredValue, quote.currency || 'MXN', notAvailable)}
                notAvailableText={notAvailable}
              />
            </CardContent>
          </Card>

          {/* Dates Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('datesAndValidity')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              <DataField
                icon={Calendar}
                label={t('quoteDate')}
                value={formatDate(quote.quoteDate)}
                notAvailableText={notAvailable}
              />
              <DataField
                icon={Clock}
                label={t('validUntil')}
                value={formatDate(quote.validUntil)}
                notAvailableText={notAvailable}
              />
              <DataField
                icon={Calendar}
                label={t('effectiveDate')}
                value={formatDate(quote.effectiveDate)}
                notAvailableText={notAvailable}
              />
              <DataField
                icon={Calendar}
                label={t('expirationDate')}
                value={formatDate(quote.expirationDate)}
                notAvailableText={notAvailable}
              />
            </CardContent>
          </Card>

          {/* Prospect Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('prospectInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              <DataField
                icon={User}
                label={t('prospectName')}
                value={safeString(quote.prospectName)}
                notAvailableText={notAvailable}
              />
              <DataField
                icon={Hash}
                label={t('prospectId')}
                value={safeString(quote.prospectId)}
                notAvailableText={notAvailable}
              />
              <DataField
                icon={Package}
                label={t('insuredObjectType')}
                value={safeString(quote.insuredObjectType)}
                notAvailableText={notAvailable}
              />
            </CardContent>
            {quote.insuredObjectDescription && (
              <CardContent className="pt-0">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">{t('insuredObjectDescription')}</p>
                  <p className="text-sm">{quote.insuredObjectDescription}</p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Coverages Tab */}
          {(coverages.length > 0 || exclusions.length > 0) && (
            <Card>
              <Tabs defaultValue="coverages">
                <CardHeader className="pb-0">
                  <TabsList>
                    <TabsTrigger value="coverages">
                      {t('coverages')} ({coverages.length})
                    </TabsTrigger>
                    <TabsTrigger value="exclusions">
                      {t('exclusions')} ({exclusions.length})
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="pt-4">
                  <TabsContent value="coverages" className="m-0 space-y-2">
                    {coverages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('noCoverages')}</p>
                    ) : (
                      coverages.map((coverage: any, index: number) => (
                        <div key={index} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{coverage.name}</span>
                            {coverage.limit && (
                              <Badge variant="outline">
                                {formatCurrency(String(coverage.limit), coverage.currency || 'MXN', '')}
                              </Badge>
                            )}
                          </div>
                          {coverage.description && (
                            <p className="text-sm text-muted-foreground mt-1">{coverage.description}</p>
                          )}
                          {coverage.optional && (
                            <Badge variant="secondary" className="mt-2 text-xs">Opcional</Badge>
                          )}
                        </div>
                      ))
                    )}
                  </TabsContent>
                  <TabsContent value="exclusions" className="m-0 space-y-2">
                    {exclusions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('noExclusions')}</p>
                    ) : (
                      exclusions.map((exclusion: any, index: number) => (
                        <div key={index} className="p-3 rounded-lg bg-red-500/5 border border-red-200/50">
                          <span className="font-medium text-red-700">{exclusion.name}</span>
                          {exclusion.description && (
                            <p className="text-sm text-muted-foreground mt-1">{exclusion.description}</p>
                          )}
                        </div>
                      ))
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* PDF Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('document')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground truncate">
                {quote.artifact?.fileName || t('noFileName')}
              </p>
              <div className="flex gap-2">
                {pdfViewerUrl && (
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={pdfViewerUrl} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4 mr-2" />
                      {t('viewPdf')}
                    </a>
                  </Button>
                )}
                {quote.artifact?.fileId && (
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={`/api/download?fileId=${encodeURIComponent(quote.artifact.fileId)}`}>
                      <Download className="h-4 w-4 mr-2" />
                      {t('download')}
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Analysis Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('analysisInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('analyzedAt')}</span>
                <span>{formatDate(quote.analyzedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('method')}</span>
                <span className="capitalize">{quote.extractionMethod || notAvailable}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('pageReferences')}</span>
                <span>{quote.pageReferences.length}</span>
              </div>
              {quote.confidence && (
                <div className="pt-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">{t('confidence')}</span>
                    <span>{(quote.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={quote.confidence * 100} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Cases */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                {t('linkedCases')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quote.caseLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noLinkedCases')}</p>
              ) : (
                <div className="space-y-2">
                  {quote.caseLinks.map(link => (
                    <Link
                      key={link.id}
                      href={`/workspace/cases/${link.caseId}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {link.case?.title || 'Case'}
                        </p>
                        {link.case?.clientName && (
                          <p className="text-xs text-muted-foreground">
                            {link.case.clientName}
                          </p>
                        )}
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmDescription', { fileName: quote.artifact?.fileName || 'esta cotización' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

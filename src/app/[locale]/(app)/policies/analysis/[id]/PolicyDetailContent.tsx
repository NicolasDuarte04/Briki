// /src/app/[locale]/(app)/policies/analysis/[id]/PolicyDetailContent.tsx
/**
 * Contenido de detalle de póliza (Client Component)
 * 
 * Muestra información completa de una póliza:
 * - Header con navegación, pin y eliminación
 * - Información general de la póliza
 * - Vigencia
 * - Datos del asegurado
 * - Coberturas y exclusiones
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
  FileText, 
  Calendar,
  Building2,
  Shield,
  DollarSign,
  Download,
  Eye,
  User,
  MapPin,
  Hash,
  CheckCircle2,
  AlertCircle,
  Info,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import { pathForPoliciesAnalysis, type Locale } from '@/lib/routes/workspace';
import { normalizePolicyData, formatCurrency, formatPolicyDate } from '@/lib/helpers/normalizePolicyData';

// ============================================================================
// TYPES
// ============================================================================

interface PolicyDetailContentProps {
  policy: {
    id: string;
    extractedData: Record<string, unknown> | null;
    overallConfidence: number;
    extractionMethod: string;
    extractedAt: string;
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
      pageNumber: number;
      confidence: unknown;
      createdAt: string;
    }>;
    caseLinks: Array<{
      id: string;
      caseId: string;
      linkedAt: string;
      linkType: string;
      case: {
        id: string;
        caseName: string | null;
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
    const firstString = Object.values(obj).find(v => typeof v === 'string' && v.length > 0);
    if (typeof firstString === 'string') return firstString;
  }
  return fallback;
}

function formatDateWithLocale(dateStr: string | undefined, fallback: string, locale: string): string {
  if (!dateStr) return fallback;
  try {
    return new Date(dateStr).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ConfidenceBadge({ confidence, translations }: { confidence: number; translations: { high: string; medium: string; low: string } }) {
  const percentage = confidence * 100;
  
  if (percentage >= 80) {
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {translations.high.replace('%percent%', percentage.toFixed(0))}
      </Badge>
    );
  }
  if (percentage >= 50) {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        {translations.medium.replace('%percent%', percentage.toFixed(0))}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
      <Info className="h-3 w-3 mr-1" />
      {translations.low.replace('%percent%', percentage.toFixed(0))}
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

export function PolicyDetailContent({ policy, isPinned, locale }: PolicyDetailContentProps) {
  const router = useRouter();
  const t = useTranslations('policies.detailPage');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkedError, setLinkedError] = useState<{ caseNames: string } | null>(null);
  
  const notAvailable = t('notAvailable');
  const safeString = (value: unknown) => safeStringWithFallback(value, notAvailable);
  const formatDate = (dateStr: string | undefined) => formatDateWithLocale(dateStr, notAvailable, locale);
  
  // ✅ CORRECCIÓN: Usar normalizador centralizado para acceder a datos extraídos
  // Esto mapea la estructura IA (insurer.name, financials.premium_total) a campos planos
  const normalized = normalizePolicyData(policy.extractedData as Record<string, unknown> | null);
  const confidence = policy.overallConfidence;
  
  // Datos normalizados con fallback a notAvailable
  const policyNumber = normalized.policyNumber || notAvailable;
  const insurer = normalized.insurer || notAvailable;
  const policyType = normalized.policyType || notAvailable;
  const sumInsured = normalized.sumInsured 
    ? formatCurrency(normalized.sumInsured, normalized.currency, locale)
    : notAvailable;
  const premium = normalized.premiumTotal 
    ? formatCurrency(normalized.premiumTotal, normalized.currency, locale)
    : notAvailable;
  const deductible = normalized.deductibleAmount
    ? `${formatCurrency(normalized.deductibleAmount, normalized.currency, locale)}${normalized.deductibleUnit ? ` (${normalized.deductibleUnit})` : ''}`
    : notAvailable;
  const startDate = normalized.effectiveFrom || notAvailable;
  const endDate = normalized.effectiveTo || notAvailable;
  
  // Datos del asegurado
  const insuredName = normalized.insuredName || notAvailable;
  const insuredAddress = normalized.insuredAddress || notAvailable;
  const insuredId = normalized.insuredId || notAvailable;
  
  // Coberturas y exclusiones (ya normalizadas con estructura rica)
  const coverages = normalized.coverages;
  const exclusions = normalized.exclusions;
  
  // Badge translations
  const badgeTranslations = {
    high: t('badges.high'),
    medium: t('badges.medium'),
    low: t('badges.low'),
  };
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/org-policies/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId: policy.id }),
      });

      if (response.ok) {
        router.push(pathForPoliciesAnalysis(locale));
      } else {
        const errorData = await response.json();
        
        // ✅ Manejar error de póliza vinculada a casos
        if (response.status === 409 && errorData.error === 'POLICY_LINKED_TO_CASES') {
          const caseNames = (errorData.linkedCases as Array<{ name: string }>)
            .map((c) => `"${c.name}"`)
            .join(', ');
          setShowDeleteConfirm(false);
          setLinkedError({ caseNames });
          return;
        }
        
        throw new Error(errorData.error || 'Error al eliminar la póliza');
      }
    } catch (error) {
      console.error('Error deleting policy:', error);
      alert(error instanceof Error ? error.message : 'Error al eliminar la póliza');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={pathForPoliciesAnalysis(locale)}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {policy.artifact?.fileName || t('policyWithoutName')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('policyNumber', { number: policyNumber })} • {t('analyzedOn', { date: formatDate(policy.extractedAt) })}
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <PinButton
            entityId={policy.id}
            entityType="policy"
            isPinned={isPinned}
          />
          <Button 
            variant="destructive" 
            size="icon"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            title={t('deletePolicy')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">{t('stats.confidence')}</div>
            <div className="mt-1">
              <ConfidenceBadge confidence={confidence} translations={badgeTranslations} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">{t('stats.insurer')}</div>
            <div className="font-medium mt-1 truncate" title={insurer}>{insurer}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">{t('stats.type')}</div>
            <div className="font-medium mt-1 truncate" title={policyType}>{policyType}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">{t('stats.linkedCases')}</div>
            <div className="font-medium mt-1">{policy.caseLinks.length}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Confidence Progress */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t('confidenceProgress.title')}</span>
            <span className="font-medium">{(confidence * 100).toFixed(1)}%</span>
          </div>
          <Progress value={confidence * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {t('confidenceProgress.method', { method: policy.extractionMethod })}
          </p>
        </CardContent>
      </Card>
      
      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">{t('tabs.info')}</TabsTrigger>
          <TabsTrigger value="coverages">
            {t('tabs.coverages')} ({coverages.length})
          </TabsTrigger>
          <TabsTrigger value="links">
            {t('tabs.links')} ({policy.caseLinks.length})
          </TabsTrigger>
          <TabsTrigger value="document">{t('tabs.document')}</TabsTrigger>
        </TabsList>
        
        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          {/* Policy Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('policyInfo.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <DataField icon={Hash} label={t('policyInfo.policyNumber')} value={policyNumber} notAvailableText={notAvailable} />
                <DataField icon={Building2} label={t('policyInfo.insurer')} value={insurer} notAvailableText={notAvailable} />
                <DataField icon={Shield} label={t('policyInfo.insuranceType')} value={policyType} notAvailableText={notAvailable} />
                <DataField icon={DollarSign} label={t('policyInfo.sumInsured')} value={sumInsured} notAvailableText={notAvailable} />
                <DataField icon={DollarSign} label={t('policyInfo.premium')} value={premium} notAvailableText={notAvailable} />
                <DataField icon={DollarSign} label={t('policyInfo.deductible')} value={deductible} notAvailableText={notAvailable} />
              </div>
            </CardContent>
          </Card>
          
          {/* Validity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('validity.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <DataField icon={Calendar} label={t('validity.startDate')} value={formatDate(startDate !== notAvailable ? startDate : undefined)} notAvailableText={notAvailable} />
                <DataField icon={Calendar} label={t('validity.endDate')} value={formatDate(endDate !== notAvailable ? endDate : undefined)} notAvailableText={notAvailable} />
              </div>
            </CardContent>
          </Card>
          
          {/* Insured Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('insuredData.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <DataField icon={User} label={t('insuredData.name')} value={insuredName} notAvailableText={notAvailable} />
                <DataField icon={Hash} label={t('insuredData.id')} value={insuredId} notAvailableText={notAvailable} />
                <DataField icon={MapPin} label={t('insuredData.address')} value={insuredAddress} notAvailableText={notAvailable} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Coverages Tab */}
        <TabsContent value="coverages" className="space-y-6">
          {coverages.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t('coveragesSection.count', { count: coverages.length })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {coverages.map((coverage, index: number) => (
                    <div key={index} className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          <span className="font-medium text-green-800 dark:text-green-200">
                            {coverage.name}
                          </span>
                        </div>
                        {coverage.limitAmount && (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                            {formatCurrency(coverage.limitAmount, coverage.limitCurrency || normalized.currency, locale)}
                          </Badge>
                        )}
                      </div>
                      {coverage.description && (
                        <p className="text-sm text-green-700 dark:text-green-300 mt-2 ml-6">
                          {coverage.description}
                        </p>
                      )}
                      {coverage.limitDescription && !coverage.limitAmount && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1 ml-6">
                          <strong>{t('coveragesSection.limit')}:</strong> {coverage.limitDescription}
                        </p>
                      )}
                      {coverage.deductibleAmount && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1 ml-6">
                          <strong>{t('coveragesSection.deductible')}:</strong> {formatCurrency(coverage.deductibleAmount, coverage.limitCurrency || normalized.currency, locale)}{coverage.deductibleUnit ? ` (${coverage.deductibleUnit})` : ''}
                        </p>
                      )}
                      {coverage.waitingPeriod && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1 ml-6">
                          <strong>{t('coveragesSection.waitingPeriod')}:</strong> {coverage.waitingPeriod} {t('coveragesSection.days')}
                        </p>
                      )}
                      {coverage.sublimits.length > 0 && (
                        <div className="mt-2 ml-6 space-y-1">
                          <p className="text-xs font-medium text-green-700 dark:text-green-300">{t('coveragesSection.sublimits')}:</p>
                          {coverage.sublimits.map((sub, subIndex) => (
                            <p key={subIndex} className="text-xs text-green-600 dark:text-green-400 pl-2">
                              • {sub.name}: {sub.amount} {sub.unit}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">{t('coveragesSection.noCoverages')}</p>
              </CardContent>
            </Card>
          )}
          
          {exclusions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  {t('exclusionsSection.count', { count: exclusions.length })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {exclusions.map((exclusion, index: number) => (
                    <div key={index} className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium text-red-800 dark:text-red-200">
                            {exclusion.name}
                          </span>
                          {exclusion.description && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {exclusion.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Links Tab */}
        <TabsContent value="links">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                {t('linksSection.title')}
              </CardTitle>
              <CardDescription>
                {t('linksSection.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {policy.caseLinks.length > 0 ? (
                <div className="space-y-2">
                  {policy.caseLinks.map((link) => (
                    <Link
                      key={link.id}
                      href={`/workspace/cases/${link.caseId}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <div className="font-medium">
                          {link.case?.caseName || link.case?.clientName || t('linksSection.caseWithoutName')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('linksSection.linkedOn', { date: formatDate(link.linkedAt) })} • {link.linkType}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <LinkIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">{t('linksSection.noLinks')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('linksSection.linkHint')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Document Tab */}
        <TabsContent value="document">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('documentSection.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {policy.artifact?.fileId ? (
                <>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" asChild>
                      <a 
                        href={`/api/storage/${policy.artifact.fileId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t('documentSection.viewPdf')}
                      </a>
                    </Button>
                    <Button variant="ghost" asChild>
                      <a 
                        href={`/api/storage/${policy.artifact.fileId}?download=true`} 
                        download={policy.artifact.fileName || 'poliza.pdf'}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {t('documentSection.download')}
                      </a>
                    </Button>
                  </div>
                  
                  {/* Page References */}
                  {policy.pageReferences.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          {t('documentSection.pageReferences', { count: policy.pageReferences.length })}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {policy.pageReferences.map((ref) => (
                            <Badge key={ref.id} variant="secondary" className="text-xs">
                              {t('documentSection.pageRef', { field: ref.fieldName, page: ref.pageNumber })}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* PDF Preview */}
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t('documentSection.preview')}</h4>
                    <iframe
                      src={`/api/storage/${policy.artifact.fileId}`}
                      width="100%"
                      height="600px"
                      className="border rounded-lg"
                      title={policy.artifact.fileName || 'PDF Preview'}
                    />
                  </div>
                </>
              ) : (
                <div className="py-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">{t('documentSection.noDocument')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { count: policy.caseLinks.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('deleteDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('deleteDialog.deleting') : t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Linked Policy Error Dialog */}
      <AlertDialog open={!!linkedError} onOpenChange={() => setLinkedError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.linkedErrorTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {linkedError && (
                linkedError.caseNames.split(',').length > 1
                  ? t('deleteDialog.linkedErrorDescriptionMultiple', { caseNames: linkedError.caseNames })
                  : t('deleteDialog.linkedErrorDescription', { caseName: linkedError.caseNames.replace(/"/g, '') })
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setLinkedError(null)}>
              {t('deleteDialog.linkedErrorDismiss')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

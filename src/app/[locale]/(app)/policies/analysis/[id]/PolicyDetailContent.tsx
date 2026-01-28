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

function safeString(value: unknown, fallback: string = 'No disponible'): string {
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
// SUB-COMPONENTS
// ============================================================================

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = confidence * 100;
  
  if (percentage >= 80) {
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Alta ({percentage.toFixed(0)}%)
      </Badge>
    );
  }
  if (percentage >= 50) {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        Media ({percentage.toFixed(0)}%)
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
      <Info className="h-3 w-3 mr-1" />
      Baja ({percentage.toFixed(0)}%)
    </Badge>
  );
}

interface DataFieldProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function DataField({ icon: Icon, label, value }: DataFieldProps) {
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
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PolicyDetailContent({ policy, isPinned, locale }: PolicyDetailContentProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const extractedData = (policy.extractedData || {}) as Record<string, unknown>;
  const confidence = policy.overallConfidence;
  
  // Extract all data safely
  const policyNumber = safeString(extractedData.policy_number);
  const insurer = safeString(extractedData.insurer);
  const policyType = safeString(extractedData.policy_type || extractedData.insurance_type);
  const sumInsured = safeString(extractedData.sum_insured);
  const premium = safeString(extractedData.premium);
  const deductible = safeString(extractedData.deductible);
  const startDate = safeString(extractedData.start_date || extractedData.effective_date);
  const endDate = safeString(extractedData.end_date || extractedData.expiry_date);
  
  // Insured data
  const insuredName = safeString(extractedData.insured_name || (extractedData.policyholder as any)?.name);
  const insuredAddress = safeString(extractedData.insured_address || (extractedData.policyholder as any)?.address);
  const insuredId = safeString(extractedData.insured_id || (extractedData.policyholder as any)?.id);
  
  // Coverages and exclusions
  const coverages = Array.isArray(extractedData.coverages) 
    ? extractedData.coverages 
    : Array.isArray(extractedData.coverage_details)
      ? extractedData.coverage_details
      : [];
  const exclusions = Array.isArray(extractedData.exclusions) ? extractedData.exclusions : [];
  
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
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar la póliza');
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
            {policy.artifact?.fileName || 'Póliza sin nombre'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Póliza #{policyNumber} • Analizada el {formatDate(policy.extractedAt)}
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
            title="Eliminar póliza"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Confianza</div>
            <div className="mt-1">
              <ConfidenceBadge confidence={confidence} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Aseguradora</div>
            <div className="font-medium mt-1 truncate" title={insurer}>{insurer}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Tipo</div>
            <div className="font-medium mt-1 truncate" title={policyType}>{policyType}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Casos Vinculados</div>
            <div className="font-medium mt-1">{policy.caseLinks.length}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Confidence Progress */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Confianza del análisis</span>
            <span className="font-medium">{(confidence * 100).toFixed(1)}%</span>
          </div>
          <Progress value={confidence * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Método de extracción: {policy.extractionMethod}
          </p>
        </CardContent>
      </Card>
      
      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="coverages">
            Coberturas ({coverages.length})
          </TabsTrigger>
          <TabsTrigger value="links">
            Vínculos ({policy.caseLinks.length})
          </TabsTrigger>
          <TabsTrigger value="document">Documento</TabsTrigger>
        </TabsList>
        
        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          {/* Policy Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información de la Póliza
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <DataField icon={Hash} label="Número de Póliza" value={policyNumber} />
                <DataField icon={Building2} label="Aseguradora" value={insurer} />
                <DataField icon={Shield} label="Tipo de Seguro" value={policyType} />
                <DataField icon={DollarSign} label="Suma Asegurada" value={sumInsured} />
                <DataField icon={DollarSign} label="Prima" value={premium} />
                <DataField icon={DollarSign} label="Deducible" value={deductible} />
              </div>
            </CardContent>
          </Card>
          
          {/* Validity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Vigencia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <DataField icon={Calendar} label="Fecha de Inicio" value={formatDate(startDate !== 'No disponible' ? startDate : undefined)} />
                <DataField icon={Calendar} label="Fecha de Vencimiento" value={formatDate(endDate !== 'No disponible' ? endDate : undefined)} />
              </div>
            </CardContent>
          </Card>
          
          {/* Insured Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Datos del Asegurado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <DataField icon={User} label="Nombre/Razón Social" value={insuredName} />
                <DataField icon={Hash} label="Identificación" value={insuredId} />
                <DataField icon={MapPin} label="Dirección" value={insuredAddress} />
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
                  Coberturas ({coverages.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {coverages.map((coverage: unknown, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="text-sm text-green-800">
                        {typeof coverage === 'string' ? coverage : safeString(coverage)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No se extrajeron coberturas de este documento</p>
              </CardContent>
            </Card>
          )}
          
          {exclusions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Exclusiones ({exclusions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {exclusions.map((exclusion: unknown, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                      <span className="text-sm text-red-800">
                        {typeof exclusion === 'string' ? exclusion : safeString(exclusion)}
                      </span>
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
                Casos Vinculados
              </CardTitle>
              <CardDescription>
                Esta póliza está vinculada a los siguientes casos
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
                          {link.case?.caseName || link.case?.clientName || 'Caso sin nombre'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Vinculado el {formatDate(link.linkedAt)} • {link.linkType}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <LinkIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Esta póliza no está vinculada a ningún caso</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Puedes vincularla al crear un nuevo caso
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
                Documento Original
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
                        Ver PDF
                      </a>
                    </Button>
                    <Button variant="ghost" asChild>
                      <a 
                        href={`/api/storage/${policy.artifact.fileId}?download=true`} 
                        download={policy.artifact.fileName || 'poliza.pdf'}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                      </a>
                    </Button>
                  </div>
                  
                  {/* Page References */}
                  {policy.pageReferences.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Referencias de Página ({policy.pageReferences.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {policy.pageReferences.map((ref) => (
                            <Badge key={ref.id} variant="secondary" className="text-xs">
                              {ref.fieldName}: Pág. {ref.pageNumber}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* PDF Preview */}
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Vista Previa</h4>
                    <iframe
                      src={`/api/storage/${policy.artifact.fileId}`}
                      width="100%"
                      height="600px"
                      className="border rounded-lg"
                      title={`Vista previa de ${policy.artifact.fileName}`}
                    />
                  </div>
                </>
              ) : (
                <div className="py-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No hay documento asociado</p>
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
            <AlertDialogTitle>¿Eliminar póliza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el análisis
              de la póliza y sus vínculos con {policy.caseLinks.length} caso(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

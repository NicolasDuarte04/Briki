// /src/app/[locale]/(app)/workspace/cases/[id]/CaseDetailContent.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
<<<<<<< HEAD
=======
import { CaseStatusBadge } from '@/components/Cases/CaseStatusBadge';
import { CaseDetailClient } from '@/components/Cases/CaseDetailClient';
import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { pathForCases, pathForEditEntity, type Locale } from '@/lib/routes/workspace';
>>>>>>> implementation-dashboard-arreglo-landing-funcionalidad-sidebar-final

interface CaseDetailContentProps {
  caseData: any; // Tipo del caso
  caseId: string;
  orgId: string;
  locale: string;
}

<<<<<<< HEAD
export function CaseDetailContent({ caseData, caseId, orgId }: CaseDetailContentProps) {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/workspace/cases">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {caseData.clientName || 'Caso sin nombre'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ID: {caseData.id}
          </p>
        </div>
=======
export function CaseDetailContent({ caseData, caseId, orgId, locale }: CaseDetailContentProps) {
  const {
    deleteDialogOpen,
    setDeleteDialogOpen,
    isDeleting,
    handleDeleteClick,
    handleDeleteConfirm
  } = useDeleteConfirmation({
    deleteApiEndpoint: '/api/cases/delete',
    redirectPath: pathForCases(locale),
    itemName: 'caso'
  });

  return (
    <>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={pathForCases(locale)}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {caseData.clientName || 'Caso sin nombre'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              ID: {caseData.id}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={pathForEditEntity('case', caseId, locale as Locale)}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              size="sm" 
              className="gap-2"
              onClick={() => handleDeleteClick(caseId)}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>
        
        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Estado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CaseStatusBadge status={caseData.status} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Etapa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">{caseData.stage}</Badge>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Prioridad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge 
                variant={
                  caseData.priority === 'urgent' ? 'destructive' :
                  caseData.priority === 'high' ? 'default' :
                  'secondary'
                }
              >
                {caseData.priority}
              </Badge>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {caseData.artifacts?.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs con información detallada */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="documents">
              Documentos ({caseData.artifacts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="activity">
              Actividad ({caseData.auditLogs?.length || 0})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {caseData.clientRef && (
                  <div>
                    <span className="font-medium">Referencia:</span> {caseData.clientRef}
                  </div>
                )}
                {caseData.clientName && (
                  <div>
                    <span className="font-medium">Nombre:</span> {caseData.clientName}
                  </div>
                )}
                {caseData.businessType && (
                  <div>
                    <span className="font-medium">Tipo de Negocio:</span> {caseData.businessType}
                  </div>
                )}
                {caseData.employees && (
                  <div>
                    <span className="font-medium">Empleados:</span> {caseData.employees}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Brief Inicial</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(caseData.briefData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="documents" className="space-y-4">
            {/* Upload Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Subir Nuevo Documento</h2>
              <CaseDetailClient caseId={caseId} orgId={orgId} auditLogs={[]} type="uploader" />
            </div>
            
            {/* Documents List */}
            <Card>
              <CardHeader>
                <CardTitle>Documentos del Caso</CardTitle>
              </CardHeader>
              <CardContent>
                {caseData.artifacts && caseData.artifacts.length > 0 ? (
                  <div className="space-y-2">
                    {caseData.artifacts.map((artifact: any) => {
                      const provenance = artifact.provenance || {};
                      const pageCount = provenance.pageCount;
                      const fileSize = provenance.fileSize;
                      
                      return (
                        <div key={artifact.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{artifact.fileName || 'Sin nombre'}</div>
                              <div className="text-sm text-muted-foreground">
                                {artifact.sourceType} • {new Date(artifact.createdAt).toLocaleDateString()}
                                {pageCount && ` • ${pageCount} páginas`}
                                {fileSize && ` • ${(fileSize / 1024 / 1024).toFixed(2)} MB`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="default">
                                Procesado
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay documentos asociados a este caso. Sube tu primer PDF arriba.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Registro de Actividad</CardTitle>
              </CardHeader>
              <CardContent>
                <CaseDetailClient caseId={caseId} orgId={orgId} auditLogs={caseData.auditLogs || []} type="timeline" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
>>>>>>> implementation-dashboard-arreglo-landing-funcionalidad-sidebar-final
      </div>
      
      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{caseData.status}</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Etapa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{caseData.stage}</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prioridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{caseData.priority || 'Normal'}</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {caseData.artifacts?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Información del Caso */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Caso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cliente</label>
              <p className="text-sm">{caseData.clientName || 'Sin especificar'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tipo de Negocio</label>
              <p className="text-sm">{caseData.businessType || 'Sin especificar'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Empleados</label>
              <p className="text-sm">{caseData.employees || 'Sin especificar'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cobertura</label>
              <p className="text-sm">{caseData.coverage || 'Sin especificar'}</p>
            </div>
          </div>
          
          {caseData.briefData?.freeText && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Descripción</label>
              <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                {caseData.briefData.freeText}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
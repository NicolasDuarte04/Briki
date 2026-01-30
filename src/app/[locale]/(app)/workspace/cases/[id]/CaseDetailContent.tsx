// /src/app/[locale]/(app)/workspace/cases/[id]/CaseDetailContent.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useState } from 'react';

interface CaseDetailContentProps {
  caseData: any; // Tipo del caso
  caseId: string;
  orgId: string;
}

export function CaseDetailContent({ caseData, caseId, orgId }: CaseDetailContentProps) {
  const router = useRouter();
  const locale = useLocale();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/delete`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Redirigir a la lista de casos
        router.push(`/${locale}/workspace/cases`);
      } else {
        throw new Error('Error al eliminar el caso');
      }
    } catch (error) {
      console.error('Error deleting case:', error);
      alert('Error al eliminar el caso. Por favor, intenta de nuevo.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${locale}/workspace/cases`}>
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
        
        {/* Botones de Acción */}
        <div className="flex gap-2">
          <Link href={`/${locale}/workspace/cases/${caseId}/edit`}>
            <Button variant="outline" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          <Button 
            variant="destructive" 
            size="icon"
            onClick={() => {
              if (window.confirm('¿Estás seguro de que deseas eliminar este caso? Esta acción no se puede deshacer.')) {
                handleDelete();
              }
            }}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
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
      
      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="artifacts">
            Artefactos ({caseData.artifacts?.length || 0})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
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
        </TabsContent>
        
        <TabsContent value="artifacts" className="mt-6">
          {/* Artifacts List */}
          {caseData.artifacts && caseData.artifacts.length > 0 ? (
            <div className="space-y-4">
              {caseData.artifacts.map((artifact: any) => (
                <Card key={artifact.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{artifact.fileName || 'Sin nombre'}</CardTitle>
                      <Badge variant="outline">
                        {artifact.sourceType}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        <strong>Tipo:</strong> {artifact.sourceType}
                      </p>
                      {artifact.contentType && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Content Type:</strong> {artifact.contentType}
                        </p>
                      )}
                      {artifact.sourceType === 'pdf' && artifact.fileId && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Vista Previa (PDF)</p>
                          <a
                            href={`/api/storage/${artifact.fileId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline mb-2 block"
                          >
                            Abrir PDF en nueva ventana
                          </a>
                          <iframe
                            src={`/api/storage/${artifact.fileId}`}
                            width="100%"
                            height="600px"
                            className="border rounded-lg"
                            style={{ minHeight: '600px' }}
                            title={`Vista previa de ${artifact.fileName}`}
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Si el PDF no se muestra, haz clic en "Abrir PDF en nueva ventana" para descargarlo.
                          </p>
                        </div>
                      )}
                      {artifact.sourceType === 'link' && artifact.provenance && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Enlace</p>
                          <a
                            href={artifact.provenance.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {artifact.provenance.url}
                          </a>
                        </div>
                      )}
                      {artifact.provenance && (
                        <details className="mt-4">
                          <summary className="cursor-pointer text-sm font-medium">
                            Ver Metadata
                          </summary>
                          <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto">
                            {JSON.stringify(artifact.provenance, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No hay artefactos asociados a este caso
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
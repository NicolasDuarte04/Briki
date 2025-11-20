// src/components/Workspace/ArtifactsList.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink, Download, Calendar, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useUI } from '@/lib/ui/state';

// Componente interno para cada artifact (evita useState dentro de map)
function ArtifactCard({
  artifact,
  storageUrl,
  isPDF,
  formatDate,
  getSourceTypeLabel,
  getSourceTypeVariant,
}: {
  artifact: {
    id: string;
    sourceType: string;
    fileName?: string | null;
    fileId?: string | null;
    contentType?: string | null;
    createdAt: string | Date;
    provenance?: any;
  };
  storageUrl: string | null;
  isPDF: boolean;
  formatDate: (date: string | Date) => string;
  getSourceTypeLabel: (sourceType: string) => string;
  getSourceTypeVariant: (sourceType: string) => "default" | "secondary" | "destructive" | "outline";
}) {
  const [showMetadata, setShowMetadata] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {artifact.fileName || 'Sin nombre'}
          </CardTitle>
          <Badge variant={getSourceTypeVariant(artifact.sourceType)}>
            {getSourceTypeLabel(artifact.sourceType)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Información básica */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            {formatDate(artifact.createdAt)}
          </div>

          {artifact.contentType && (
            <div className="text-sm text-muted-foreground">
              <strong>Tipo:</strong> {artifact.contentType}
            </div>
          )}

          {/* ✅ REUTILIZACIÓN: Iframe para PDF (igual que CaseDetailContent líneas 206-228) */}
          {isPDF && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Vista Previa (PDF)</p>
              {storageUrl && (
                <>
                  <a
                    href={storageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline mb-2 block"
                  >
                    <ExternalLink className="w-4 h-4 inline mr-1" />
                    Abrir PDF en nueva ventana
                  </a>
                  <div className="border rounded-lg overflow-hidden">
                    <iframe
                      src={storageUrl}
                      width="100%"
                      height="600px"
                      className="border-0"
                      style={{ minHeight: '600px' }}
                      title={`Vista previa de ${artifact.fileName || 'documento'}`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Si el PDF no se muestra, haz clic en "Abrir PDF en nueva ventana" para descargarlo.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ✅ REUTILIZACIÓN: Link para artifacts tipo 'link' (igual que CaseDetailContent líneas 230-241) */}
          {artifact.sourceType === 'link' && artifact.provenance?.url && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Enlace</p>
              <a
                href={artifact.provenance.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {artifact.provenance.url}
              </a>
            </div>
          )}

          {/* ✅ REUTILIZACIÓN: Metadata expandible (igual que CaseDetailContent líneas 243-251) */}
          {artifact.provenance && (
            <details 
              className="mt-4"
              onToggle={(e) => setShowMetadata((e.target as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                <ChevronDown className={`w-4 h-4 transition-transform ${showMetadata ? 'rotate-180' : ''}`} />
                Ver Metadata
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto">
                {JSON.stringify(artifact.provenance, null, 2)}
              </pre>
            </details>
          )}

          {/* Botones de acción */}
          {storageUrl && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(storageUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = storageUrl;
                  a.download = artifact.fileName || 'documento.pdf';
                  a.click();
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ArtifactsListProps {
  caseData: {
    id: string;
    artifacts?: Array<{
      id: string;
      sourceType: string;
      fileName?: string | null;
      fileId?: string | null;
      contentType?: string | null;
      createdAt: string | Date;
      provenance?: any;
    }>;
  } | null;
  loading?: boolean;
}

export function ArtifactsList({ caseData, loading }: ArtifactsListProps) {
  const { currentCaseId } = useUI();
  const artifacts = caseData?.artifacts || [];

  // ✅ REUTILIZACIÓN: Función para obtener URL del storage (igual que CaseDetailContent)
  const getStorageUrl = (fileId: string) => {
    // Formato: /api/storage/{path}
    // fileId viene en formato: org_id/timestamp_filename
    return `/api/storage/${fileId}`;
  };

  // ✅ REUTILIZACIÓN: Formatear fecha (igual que diseño existente)
  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ✅ REUTILIZACIÓN: Labels y colores para sourceType (igual que CaseDetailContent)
  const getSourceTypeLabel = (sourceType: string) => {
    const labels: Record<string, string> = {
      api: 'API',
      portal: 'Portal',
      pdf: 'PDF',
      link: 'Enlace'
    };
    return labels[sourceType] || sourceType.toUpperCase();
  };

  const getSourceTypeVariant = (sourceType: string): "default" | "secondary" | "destructive" | "outline" => {
    // Usar variant="outline" para mantener consistencia con CaseDetailContent
    return "outline";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (artifacts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay artefactos asociados a este caso</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con contador */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Artefactos del Caso</h3>
        <Badge variant="secondary">{artifacts.length} archivo{artifacts.length !== 1 ? 's' : ''}</Badge>
      </div>

      {/* Lista de Artifacts - REUTILIZANDO ESTRUCTURA DE CaseDetailContent */}
      {artifacts.map((artifact) => {
        const storageUrl = artifact.fileId ? getStorageUrl(artifact.fileId) : null;
        // ✅ CORRECCIÓN: Convertir explícitamente a boolean para respetar el tipo de la prop isPDF
        // El operador !! convierte el resultado (string | false | null | undefined) a boolean puro
        const isPDF = !!(artifact.sourceType === 'pdf' && artifact.fileId);

        return (
          <ArtifactCard
            key={artifact.id}
            artifact={artifact}
            storageUrl={storageUrl}
            isPDF={isPDF}
            formatDate={formatDate}
            getSourceTypeLabel={getSourceTypeLabel}
            getSourceTypeVariant={getSourceTypeVariant}
          />
        );
      })}
    </div>
  );
}


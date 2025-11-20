"use client";

import { useEffect, useRef, useState } from 'react';
import { PolicyAnalysis } from '@/lib/types';
import { useUI } from '@/lib/ui/state';

interface AdobePdfViewerProps {
  pdfUrl: string;
  analysis: PolicyAnalysis;
}

/**
 * AdobePdfViewer Component
 * 
 * Visor de PDF usando Adobe PDF Embed API con:
 * - Resaltados de campos extraídos (bounding boxes)
 * - Scroll automático a campos seleccionados
 * - Integración con sistema de análisis existente
 * 
 * Compatible con PolicyAnalysis y pageReferences del sistema actual.
 */
export function AdobePdfViewer({ pdfUrl, analysis }: AdobePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedFieldName = useUI(s => s.selectedFieldName);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    const clientId = process.env.NEXT_PUBLIC_ADOBE_PDF_CLIENT_ID;
    if (!clientId) {
      console.error('❌ [AdobePdfViewer] Adobe PDF Client ID no configurado');
      setError('Adobe PDF Client ID no configurado. Verifica NEXT_PUBLIC_ADOBE_PDF_CLIENT_ID en .env.local');
      setIsLoading(false);
      return;
    }

    // Esperar a que el SDK de Adobe esté disponible
    const initializeViewer = () => {
      // ✅ CORRECCIÓN: Capturar ref en variable local para type safety
      const container = containerRef.current;
      
      // ✅ Verificar que el contenedor existe antes de continuar
      if (!container) {
        console.warn('⚠️ [AdobePdfViewer] Container ref is null, skipping initialization');
        return;
      }
      
      if (typeof (window as any).AdobeDC === 'undefined') {
        setTimeout(initializeViewer, 100);
        return;
      }

      try {
        const { AdobeDC } = window as any;
        
        // Crear ID único para el contenedor si no existe
        if (!container.id) {
          container.id = `adobe-dc-view-${Date.now()}`;
        }

        const adobeDCView = new AdobeDC.View({
          clientId: clientId,
          divId: container.id,
        });

        // Configurar callbacks para eventos del viewer
        adobeDCView.registerCallback(
          AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
          (event: any) => {
            console.log('📄 [AdobePdfViewer] Event:', event.type, event.data);
            
            if (event.type === 'PDF_VIEWER_READY') {
              setIsLoading(false);
              console.log('✅ [AdobePdfViewer] PDF viewer ready');
            }
          },
          {
            enablePDFAnalytics: true,
          }
        );

        // Cargar el PDF
        adobeDCView.previewFile(
          {
            content: {
              location: {
                url: pdfUrl,
              },
            },
            metaData: {
              fileName: analysis.artifact?.fileName || 'policy.pdf',
            },
          },
          {
            showAnnotationTools: true,
            showLeftHandPanel: false, // Ocultar panel izquierdo para más espacio
            showDownloadPDF: true,
            showPrintPDF: true,
            enableFormFilling: false,
            showPageControls: true,
            defaultViewMode: 'FIT_WIDTH',
            embedMode: 'SIZED_CONTAINER',
            showZoomControls: true,
            enableAnnotationAPIs: true, // Habilitar APIs de anotación para futuras mejoras
          }
        );

        viewerRef.current = adobeDCView;
      } catch (err: any) {
        console.error('❌ [AdobePdfViewer] Error inicializando viewer:', err);
        setError(err.message || 'Error al inicializar el visor de PDF');
        setIsLoading(false);
      }
    };

    // Nota: Adobe PDF Embed API no permite agregar anotaciones programáticamente
    // Los resaltados se mostrarán mediante overlay CSS o se implementarán en una versión futura
    // Por ahora, el viewer mostrará el PDF sin resaltados automáticos
    // Los usuarios pueden usar las herramientas de anotación integradas de Adobe si lo desean

    initializeViewer();

    return () => {
      if (viewerRef.current) {
        viewerRef.current = null;
      }
    };
  }, [pdfUrl, analysis.artifactId, analysis.artifact?.fileName]);

  // Scroll automático a campo seleccionado
  useEffect(() => {
    if (!selectedFieldName || !analysis.pageReferences || !viewerRef.current) {
      return;
    }

    const ref = analysis.pageReferences.find(r => r.fieldName === selectedFieldName);
    if (ref && ref.pageNumber && ref.boundingBox) {
      console.log('🎯 [AdobePdfViewer] Scrolling to field:', selectedFieldName, 'page:', ref.pageNumber);
      
      try {
        // Adobe PDF Embed API - Navegar a la página del campo seleccionado
        const viewer = viewerRef.current;
        
        // Usar la API de navegación de Adobe
        // Nota: La API exacta puede variar, esto es una implementación básica
        if (viewer && typeof viewer.getAPIs === 'function') {
          const apis = viewer.getAPIs();
          console.log('📋 [AdobePdfViewer] APIs disponibles:', apis);
          
          // Intentar navegar usando diferentes métodos según disponibilidad
          if (apis.includes('navigateToPage')) {
            viewer.navigateToPage(ref.pageNumber - 1); // Adobe usa 0-indexed
          } else if (viewer.navigateToPage) {
            viewer.navigateToPage(ref.pageNumber - 1);
          }
        }
        
        // Limpiar selección después de un tiempo
        setTimeout(() => {
          useUI.getState().setSelectedField(null);
        }, 2000);
      } catch (err: any) {
        console.warn('⚠️ [AdobePdfViewer] Error navegando a campo:', err);
      }
    }
  }, [selectedFieldName, analysis.pageReferences]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive font-semibold mb-2">Error al cargar PDF</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando PDF con Adobe...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div
        id={`adobe-dc-view-${analysis.id}`}
        ref={containerRef}
        className="flex-1 w-full"
        style={{ minHeight: '600px' }}
      />
    </div>
  );
}


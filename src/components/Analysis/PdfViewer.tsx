"use client";

// 🔍 LOG 1: Módulo PdfViewer.tsx siendo evaluado
console.log('🔍 [PdfViewer] MODULE EVALUATION START', {
  timestamp: new Date().toISOString(),
  environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR',
  hasWindow: typeof window !== 'undefined',
  hasDocument: typeof document !== 'undefined',
  stackTrace: new Error().stack?.split('\n').slice(0, 10).join('\n')
});

import React, { useState, useEffect } from 'react';

// 🔍 LOG 2: Antes de importar react-pdf
console.log('🔍 [PdfViewer] BEFORE react-pdf import', {
  timestamp: new Date().toISOString(),
  environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR'
});

import { Document, Page, pdfjs } from 'react-pdf';

// 🔍 LOG 3: Después de importar react-pdf
console.log('🔍 [PdfViewer] AFTER react-pdf import', {
  timestamp: new Date().toISOString(),
  environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR',
  pdfjsExists: typeof pdfjs !== 'undefined',
  pdfjsType: typeof pdfjs,
  pdfjsKeys: typeof pdfjs !== 'undefined' ? Object.keys(pdfjs).slice(0, 10) : [],
  GlobalWorkerOptionsExists: typeof pdfjs !== 'undefined' && 'GlobalWorkerOptions' in pdfjs,
  stackTrace: new Error().stack?.split('\n').slice(0, 10).join('\n')
});

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { PolicyAnalysis } from '@/lib/types';
import { useUI } from '@/lib/ui/state';
import { AdobePdfViewer } from './AdobePdfViewer';

// 🔍 LOG 4: Fin de imports
console.log('🔍 [PdfViewer] ALL IMPORTS COMPLETE', {
  timestamp: new Date().toISOString(),
  environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR'
});

interface PdfViewerProps {
  analysis: PolicyAnalysis;
}

/**
 * PdfViewer Component - FASE 5
 * 
 * Visor de PDF con capacidades de:
 * - Navegación de páginas
 * - Zoom
 * - Resaltados sobre áreas específicas (bounding boxes)
 * - Scroll automático a campos seleccionados
 * 
 * Soporta dos modos:
 * - react-pdf (default): Visor ligero con resaltados custom
 * - Adobe PDF Embed API: Visor profesional con mejor rendimiento
 * 
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 6.2.1
 */
export function PdfViewer({ analysis }: PdfViewerProps) {
  // Toggle entre react-pdf y Adobe PDF Embed API
  // Por defecto usa react-pdf, pero puede cambiarse con variable de entorno
  const useAdobe = process.env.NEXT_PUBLIC_USE_ADOBE_PDF === 'true';
  
  // Si Adobe está habilitado y tenemos Client ID, usar Adobe
  const adobeClientId = process.env.NEXT_PUBLIC_ADOBE_PDF_CLIENT_ID;
  const shouldUseAdobe = useAdobe && !!adobeClientId;
  // 🔍 LOG 5: Componente PdfViewer renderizando
  console.log('🔍 [PdfViewer] COMPONENT RENDER START', {
    timestamp: new Date().toISOString(),
    environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR',
    hasWindow: typeof window !== 'undefined',
    hasDocument: typeof document !== 'undefined',
    analysisId: analysis?.id,
    stackTrace: new Error().stack?.split('\n').slice(0, 15).join('\n')
  });

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const selectedFieldName = useUI(s => s.selectedFieldName);
  
  // ✅ Configure PDF.js worker (client-side only)
  useEffect(() => {
    console.log('🔍 [PdfViewer] useEffect[pdfjs config] EXECUTING', {
      timestamp: new Date().toISOString(),
      environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR',
      hasWindow: typeof window !== 'undefined',
      pdfjsExists: typeof pdfjs !== 'undefined',
      GlobalWorkerOptionsExists: typeof pdfjs !== 'undefined' && 'GlobalWorkerOptions' in pdfjs,
      stackTrace: new Error().stack?.split('\n').slice(0, 15).join('\n')
    });

    if (typeof window !== 'undefined') {
      try {
        console.log('🔍 [PdfViewer] SETTING pdfjs.GlobalWorkerOptions.workerSrc', {
          timestamp: new Date().toISOString(),
          pdfjsVersion: pdfjs?.version,
          beforeValue: pdfjs?.GlobalWorkerOptions?.workerSrc,
          newValue: `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
        });
        
        // ✅ PLAN PRIMARIO AJUSTADO: Webpack ahora maneja .mjs correctamente
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        
        console.log('🔍 [PdfViewer] pdfjs.GlobalWorkerOptions.workerSrc SET SUCCESSFULLY', {
          timestamp: new Date().toISOString(),
          afterValue: pdfjs?.GlobalWorkerOptions?.workerSrc
        });
      } catch (err: any) {
        console.error('🔍 [PdfViewer] ERROR setting pdfjs.GlobalWorkerOptions.workerSrc', {
          timestamp: new Date().toISOString(),
          error: err,
          errorMessage: err?.message,
          errorStack: err?.stack,
          pdfjsType: typeof pdfjs,
          pdfjsKeys: typeof pdfjs !== 'undefined' ? Object.keys(pdfjs).slice(0, 20) : []
        });
        throw err;
      }
    } else {
      console.warn('🔍 [PdfViewer] SKIPPING pdfjs config (SSR environment)', {
        timestamp: new Date().toISOString(),
        environment: 'SSR'
      });
    }
  }, []);
  
  // Fetch PDF from storage
  useEffect(() => {
    const fetchPdf = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get artifact file ID
        const artifactId = analysis.artifactId;
        
        // Construct URL to download PDF (adjust based on your storage setup)
        // This assumes a public API endpoint that returns the PDF
        const url = `/api/artifacts/${artifactId}/download`;
        
        setPdfUrl(url);
      } catch (err: any) {
        console.error('Error fetching PDF:', err);
        setError(err.message || 'Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPdf();
  }, [analysis.artifactId]);
  
  // Auto-scroll to selected field when it changes
  useEffect(() => {
    if (selectedFieldName && analysis.pageReferences) {
      const ref = analysis.pageReferences.find(r => r.fieldName === selectedFieldName);
      if (ref) {
        console.log('🎯 [PdfViewer] Scrolling to field:', selectedFieldName, 'page:', ref.pageNumber);
        setPageNumber(ref.pageNumber);
        // Clear selection after scrolling
        setTimeout(() => useUI.getState().setSelectedField(null), 2000);
      }
    }
  }, [selectedFieldName, analysis.pageReferences]);

  // Si usamos Adobe y tenemos la URL del PDF, renderizar AdobePdfViewer directamente
  if (shouldUseAdobe && pdfUrl) {
    return <AdobePdfViewer pdfUrl={pdfUrl} analysis={analysis} />;
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    console.log('✅ [PdfViewer] PDF loaded:', numPages, 'pages');
  }

  function onDocumentLoadError(error: Error) {
    console.error('❌ [PdfViewer] PDF load error:', error);
    setError(error.message || 'Failed to load PDF');
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return Math.max(1, Math.min(newPage, numPages));
    });
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }

  function zoomIn() {
    setScale(prevScale => Math.min(prevScale + 0.2, 3.0));
  }

  function zoomOut() {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  }

  async function downloadPdf() {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = analysis.artifact?.fileName || 'policy.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading PDF:', err);
    }
  }

  // Get highlights for current page
  const currentPageHighlights = analysis.pageReferences?.filter(
    ref => ref.pageNumber === pageNumber && ref.boundingBox
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando PDF...</p>
      </div>
    );
  }

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

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={previousPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            Página {pageNumber} de {numPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={nextPage}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadPdf}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* PDF Document */}
      <div className="flex-1 overflow-auto p-4 bg-muted/20">
        <div className="flex justify-center">
          <div className="relative">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<div className="p-4">Cargando documento...</div>}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
            
            {/* Highlight Overlays */}
            {currentPageHighlights.map((ref, index) => {
              if (!ref.boundingBox) return null;
              
              const { x, y, width, height } = ref.boundingBox;
              
              // Calculate pixel positions (scale PDF coordinates to actual rendered size)
              // Note: These calculations may need adjustment based on actual PDF dimensions
              const pixelX = x * scale * 96; // 96 DPI
              const pixelY = y * scale * 96;
              const pixelWidth = width * scale * 96;
              const pixelHeight = height * scale * 96;
              
              const isSelected = ref.fieldName === selectedFieldName;
              
              return (
                <div
                  key={`highlight-${ref.id}-${index}`}
                  className={`absolute border-2 pointer-events-none transition-colors ${
                    isSelected
                      ? 'border-yellow-400 bg-yellow-200/30'
                      : 'border-blue-400 bg-blue-200/20'
                  }`}
                  style={{
                    left: `${pixelX}px`,
                    top: `${pixelY}px`,
                    width: `${pixelWidth}px`,
                    height: `${pixelHeight}px`,
                  }}
                  title={`${ref.fieldName}: ${ref.fieldValue} (${Math.round(ref.confidence * 100)}% confianza)`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


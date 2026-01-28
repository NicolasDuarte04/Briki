
"use client";

import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, FileText } from 'lucide-react';
import { PolicyAnalysis } from '@/lib/types';
import { PdfMinimap } from './PdfMinimap';
import { PageNavigation } from './PageNavigation';
import { PdfHighlightsLayer } from './PdfHighlightsLayer';
import { useTranslations } from 'next-intl';

// Configurar worker de PDF.js
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PdfViewerProps {
  analysis: PolicyAnalysis;
  initialPage?: number;
  onPageChange?: (pageNumber: number) => void;
  selectedFieldName?: string | null; // ✅ NUEVO
}

/**
 * PdfViewer Component - FASE 5 (Mejorado)
 * 
 * Visor de PDF con:
 * - Navegación de páginas (básica y avanzada)
 * - Thumbnails en minimap
 * - Zoom
 * - Descarga
 * - Integración con FindingsList
 * 
 * NOTA: Highlights se implementarán en próxima fase.
 * 
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 6.2.1
 */
export function PdfViewer({ analysis, initialPage, onPageChange, selectedFieldName }: PdfViewerProps) {
  const t = useTranslations('policies.analysis');
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ FASE 5: Estado para dimensiones de página renderizada
  const [renderedDimensions, setRenderedDimensions] = useState<{ width: number; height: number } | null>(null);

  // Obtener URL del PDF desde el artifact
  useEffect(() => {
    const loadPdfUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        // El análisis tiene un artifactId que referencia el PDF en Storage
        const artifactId = analysis.artifactId;

        if (!artifactId) {
          throw new Error('No artifact ID found in analysis');
        }

        // Construir URL para descargar el PDF
        const url = `/api/artifacts/${artifactId}/download`;
        setPdfUrl(url);
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        setError(err.message || 'Failed to load PDF');
        setLoading(false);
      }
    };

    loadPdfUrl();
  }, [analysis.artifactId]);

  // Actualizar página si se proporciona initialPage
  useEffect(() => {
    if (initialPage && initialPage !== pageNumber) {
      console.log(`📄 [PdfViewer] Navigating to initial page: ${initialPage}`);
      setPageNumber(initialPage);
    }
  }, [initialPage]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    console.log(`✅ PDF loaded successfully: ${numPages} pages`);
  }

  function onDocumentLoadError(error: Error) {
    console.error('❌ PDF load error:', error);
    setError('No se pudo cargar el PDF');
  }

  // ✅ FASE 5: Capturar dimensiones al cargar la página
  function onPageLoadSuccess(page: any) {
    console.log(`📄 Page loaded: ${page.width}x${page.height}`);
    setRenderedDimensions({
      width: page.width,
      height: page.height
    });
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      const validPage = Math.min(Math.max(1, newPage), numPages);

      // Notificar cambio de página
      if (onPageChange) {
        onPageChange(validPage);
      }

      return validPage;
    });
  }

  function handlePageChange(newPage: number) {
    setPageNumber(newPage);

    // Notificar cambio de página
    if (onPageChange) {
      onPageChange(newPage);
    }
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

  function handleDownload() {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Cargando PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-destructive font-medium">Error al cargar PDF</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b bg-background">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Navegación básica */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={previousPage}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {pageNumber} de {numPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={pageNumber >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom y descarga */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={zoomOut}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={zoomIn}
              disabled={scale >= 3.0}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navegación avanzada */}
        <div className="px-4 pb-2">
          <PageNavigation
            currentPage={pageNumber}
            totalPages={numPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto bg-muted/30 p-4 relative">
        <div className="flex justify-center">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('loadingDocument')}</p>
              </div>
            }
          >
            <div className="relative">
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-lg"
                onLoadSuccess={onPageLoadSuccess}
              />

              {/* ✅ FASE 5: Capa de Highlights */}
              {renderedDimensions && analysis.pageReferences && (
                <PdfHighlightsLayer
                  references={analysis.pageReferences}
                  pageNumber={pageNumber}
                  pageDimensions={renderedDimensions}
                  scale={scale}
                />
              )}
            </div>
          </Document>
        </div>

        {/* Minimap con navegación */}
        {numPages > 0 && pdfUrl && (
          <PdfMinimap
            pdfUrl={pdfUrl}
            currentPage={pageNumber}
            totalPages={numPages}
            onPageClick={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}

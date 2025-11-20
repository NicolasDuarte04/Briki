"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FileText, ChevronUp, ChevronDown, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { generatePageThumbnail, type Thumbnail } from '@/lib/pdf/thumbnailGenerator';

interface PdfMinimapProps {
  pdfUrl?: string;         // URL del PDF para generar thumbnails
  currentPage?: number;
  totalPages?: number;
  onPageClick?: (pageNumber: number) => void;
}

/**
 * PdfMinimap Component - FASE 5 (Mejorado)
 * 
 * Mini mapa de navegación para el PDF con thumbnails reales:
 * - Generación de thumbnails usando pdf.js
 * - Lista de páginas con preview visual
 * - Indicador de página actual
 * - Click para navegar a una página
 * - Generación lazy de thumbnails
 * 
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 6.2.1
 */
export function PdfMinimap({ 
  pdfUrl,
  currentPage = 1, 
  totalPages = 10,
  onPageClick
}: PdfMinimapProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [thumbnails, setThumbnails] = useState<Map<number, Thumbnail>>(new Map());
  const [loadingPages, setLoadingPages] = useState<Set<number>>(new Set());
  const generationQueueRef = useRef<Set<number>>(new Set());

  // Limitar páginas visibles cuando está colapsado
  const visiblePages = isExpanded ? totalPages : Math.min(5, totalPages);
  
  // Calcular rango de páginas a mostrar cuando está colapsado
  const getPageRange = () => {
    if (isExpanded) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Mostrar páginas alrededor de la actual
    const halfRange = Math.floor(visiblePages / 2);
    let start = Math.max(1, currentPage - halfRange);
    let end = Math.min(totalPages, start + visiblePages - 1);
    
    // Ajustar si llegamos al final
    if (end - start + 1 < visiblePages) {
      start = Math.max(1, end - visiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const pages = getPageRange();

  /**
   * Genera thumbnail para una página específica
   */
  const generateThumbnail = async (pageNumber: number) => {
    if (!pdfUrl) return;
    if (generationQueueRef.current.has(pageNumber)) return;
    if (thumbnails.has(pageNumber)) return;

    generationQueueRef.current.add(pageNumber);
    setLoadingPages(prev => new Set(prev).add(pageNumber));

    try {
      const thumbnail = await generatePageThumbnail(pdfUrl, pageNumber, {
        scale: 0.2,
        quality: 0.7,
        format: 'jpeg'
      });

      setThumbnails(prev => new Map(prev).set(pageNumber, thumbnail));
    } catch (error) {
      console.error(`Error generating thumbnail for page ${pageNumber}:`, error);
    } finally {
      setLoadingPages(prev => {
        const newSet = new Set(prev);
        newSet.delete(pageNumber);
        return newSet;
      });
      generationQueueRef.current.delete(pageNumber);
    }
  };

  /**
   * Genera thumbnails para páginas visibles
   */
  useEffect(() => {
    if (!pdfUrl) return;

    // Generar thumbnails para páginas visibles
    pages.forEach(pageNum => {
      if (!thumbnails.has(pageNum) && !loadingPages.has(pageNum)) {
        generateThumbnail(pageNum);
      }
    });
  }, [pages, pdfUrl, thumbnails, loadingPages]);

  /**
   * Pre-generar thumbnails para página actual y adyacentes
   */
  useEffect(() => {
    if (!pdfUrl) return;

    // Generar thumbnails para página actual y las 2 siguientes y 2 anteriores
    const pagesToGenerate = [
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2
    ].filter(p => p >= 1 && p <= totalPages);

    pagesToGenerate.forEach(pageNum => {
      if (!thumbnails.has(pageNum) && !loadingPages.has(pageNum)) {
        generateThumbnail(pageNum);
      }
    });
  }, [currentPage, pdfUrl, totalPages]);

  function handlePageClick(pageNumber: number) {
    onPageClick?.(pageNumber);
  }

  return (
    <div className="absolute bottom-4 right-4 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg z-50 max-w-[200px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span className="font-medium">Páginas</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 w-6 p-0"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Page List */}
      <div className={cn(
        "overflow-y-auto",
        isExpanded ? "max-h-[500px]" : "max-h-[250px]"
      )}>
        <div className="p-2 space-y-2">
          {pages.map((pageNum) => {
            const thumbnail = thumbnails.get(pageNum);
            const isLoading = loadingPages.has(pageNum);

            return (
              <button
                key={pageNum}
                onClick={() => handlePageClick(pageNum)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded transition-all",
                  pageNum === currentPage
                    ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-1"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground hover:shadow"
                )}
              >
                {/* Thumbnail o placeholder */}
                <div className={cn(
                  "flex-shrink-0 flex items-center justify-center rounded overflow-hidden border",
                  pageNum === currentPage ? "border-primary-foreground" : "border-border",
                  "w-12 h-16 bg-muted/50"
                )}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : thumbnail ? (
                    <img
                      src={thumbnail.dataUrl}
                      alt={`Página ${pageNum}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </div>

                {/* Número de página */}
                <div className="flex-1 text-left">
                  <span className={cn(
                    "text-xs font-medium",
                    pageNum === currentPage ? "text-primary-foreground" : ""
                  )}>
                    Pág. {pageNum}
                  </span>
                </div>

                {/* Indicador de página actual */}
                {pageNum === currentPage && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer con contador */}
      <div className="px-3 py-2 border-t text-[10px] text-muted-foreground text-center">
        {currentPage} / {totalPages} páginas
      </div>
    </div>
  );
}

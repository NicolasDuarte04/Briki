"use client";

import React from 'react';
import { FileText } from 'lucide-react';

/**
 * PdfMinimap Component - FASE 5
 * 
 * Mini mapa de navegación para el PDF:
 * - Thumbnails de páginas
 * - Indicador de página actual
 * - Click para navegar a una página
 * 
 * NOTA: Implementación simplificada para FASE 5.
 * En producción, considerar generar thumbnails reales del PDF.
 * 
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 6.2.1
 */
export function PdfMinimap() {
  // TODO: Implementar thumbnails reales en próxima fase
  // Por ahora, solo muestra un indicador estático
  
  return (
    <div className="absolute bottom-4 right-4 bg-background/95 border rounded-lg shadow-lg p-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="h-3 w-3" />
        <span>Minimapa</span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        (Próximamente: thumbnails)
      </p>
    </div>
  );
}


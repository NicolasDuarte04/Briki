"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { FindingsList } from './FindingsList';
import { AnnotationsPanel } from './AnnotationsPanel';
import { useUI } from '@/lib/ui/state';

// ✅ Dynamic import con ssr: false para evitar error SSR con pdfjs-dist
const PdfViewer = dynamic(
  () => import('./PdfViewer').then(mod => mod.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando visor PDF...</p>
      </div>
    )
  }
);

/**
 * AnalysisTab Component
 * 
 * Tab principal para visualizar análisis de pólizas en PDF.
 * Estructura:
 * - Panel izquierdo: Visor de PDF con resaltados
 * - Panel derecho: Hallazgos y anotaciones
 */
export function AnalysisTab() {
  // Estado local para sincronizar navegación entre FindingsList y PdfViewer
  const [targetPage, setTargetPage] = React.useState<number | undefined>();
  
  const selectedAnalysisId = useUI(s => s.selectedPolicyAnalysisId);
  const analyses = useUI(s => s.policyAnalyses);
  
  const selectedAnalysis = analyses.find(a => a.id === selectedAnalysisId);
  
  // Handler para navegación desde FindingsList
  const handleNavigateToPage = (pageNumber: number) => {
    setTargetPage(pageNumber);
    // Reset después de un breve delay para permitir múltiples navegaciones
    setTimeout(() => setTargetPage(undefined), 100);
  };
  
  if (!selectedAnalysis) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">
          Selecciona una póliza para ver su análisis
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex h-full">
      {/* Panel Izquierdo: Visor PDF */}
      <div className="flex-1 relative">
        <PdfViewer 
          analysis={selectedAnalysis} 
          initialPage={targetPage}
        />
      </div>
      
      {/* Panel Derecho: Hallazgos y Anotaciones */}
      <div className="w-80 border-l overflow-y-auto bg-background">
        <FindingsList 
          analysis={selectedAnalysis} 
          onNavigateToPage={handleNavigateToPage}
        />
        <AnnotationsPanel analysisId={selectedAnalysis.id} />
      </div>
    </div>
  );
}


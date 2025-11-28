"use client";

// 🔍 LOG 1: Módulo AnalysisTab.tsx siendo evaluado
console.log('🔍 [AnalysisTab] MODULE EVALUATION START', {
  timestamp: new Date().toISOString(),
  environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR',
  hasWindow: typeof window !== 'undefined',
  stackTrace: new Error().stack?.split('\n').slice(0, 10).join('\n')
});

import React from 'react';
import dynamic from 'next/dynamic';

// 🔍 LOG 2: Antes de crear dynamic import
console.log('🔍 [AnalysisTab] BEFORE dynamic import creation', {
  timestamp: new Date().toISOString(),
  environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR'
});

// ✅ CORRECCIÓN CRÍTICA: Dynamic import con ssr: false para evitar error SSR
// pdfjs-dist NO es compatible con Server-Side Rendering
const PdfViewer = dynamic(
  () => {
    console.log('🔍 [AnalysisTab] DYNAMIC IMPORT CALLBACK EXECUTING', {
      timestamp: new Date().toISOString(),
      environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR',
      hasWindow: typeof window !== 'undefined',
      stackTrace: new Error().stack?.split('\n').slice(0, 15).join('\n')
    });

    return import('./PdfViewer').then(mod => {
      console.log('🔍 [AnalysisTab] DYNAMIC IMPORT RESOLVED', {
        timestamp: new Date().toISOString(),
        environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR',
        hasPdfViewer: typeof mod?.PdfViewer !== 'undefined',
        modKeys: Object.keys(mod)
      });
      return { default: mod.PdfViewer };
    }).catch(err => {
      console.error('🔍 [AnalysisTab] DYNAMIC IMPORT ERROR', {
        timestamp: new Date().toISOString(),
        error: err,
        errorMessage: err?.message,
        errorStack: err?.stack
      });
      throw err;
    });
  },
  {
    ssr: false,
    loading: () => {
      console.log('🔍 [AnalysisTab] PdfViewer LOADING component rendering', {
        timestamp: new Date().toISOString(),
        environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR'
      });
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Cargando visor PDF...</p>
        </div>
      );
    }
  }
);

// 🔍 LOG 3: Después de crear dynamic import
console.log('🔍 [AnalysisTab] AFTER dynamic import creation', {
  timestamp: new Date().toISOString(),
  environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR',
  PdfViewerType: typeof PdfViewer
});

import { FindingsList } from './FindingsList';
import { AnnotationsPanel } from './AnnotationsPanel';
import { useUI } from '@/lib/ui/state';

// 🔍 LOG 4: Fin de imports
console.log('🔍 [AnalysisTab] ALL IMPORTS COMPLETE', {
  timestamp: new Date().toISOString(),
  environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR'
});

/**
 * AnalysisTab Component - FASE 5
 * 
 * Tab principal para visualizar análisis de pólizas en PDF.
 * Estructura:
 * - Panel izquierdo: Visor de PDF con resaltados
 * - Panel derecho: Hallazgos y anotaciones
 * 
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 6.2.1
 */
export function AnalysisTab() {
  // Estado local para sincronizar navegación entre FindingsList y PdfViewer
  const [targetPage, setTargetPage] = React.useState<number | undefined>();

  // 🔍 LOG 5: Componente AnalysisTab renderizando
  console.log('🔍 [AnalysisTab] COMPONENT RENDER START', {
    timestamp: new Date().toISOString(),
    environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR',
    hasWindow: typeof window !== 'undefined',
    stackTrace: new Error().stack?.split('\n').slice(0, 15).join('\n')
  });

  const selectedAnalysisId = useUI(s => s.selectedPolicyAnalysisId);
  const analyses = useUI(s => s.policyAnalyses);

  console.log('🔍 [AnalysisTab] STATE VALUES', {
    timestamp: new Date().toISOString(),
    selectedAnalysisId,
    analysesCount: analyses?.length || 0,
    analysesIds: analyses?.map(a => a.id) || []
  });

  const selectedAnalysis = analyses.find(a => a.id === selectedAnalysisId);

  console.log('🔍 [AnalysisTab] SELECTED ANALYSIS', {
    timestamp: new Date().toISOString(),
    hasSelectedAnalysis: !!selectedAnalysis,
    selectedAnalysisId: selectedAnalysis?.id
  });

  // Handler para navegación desde FindingsList
  const handleNavigateToPage = (pageNumber: number) => {
    console.log('🔍 [AnalysisTab] Navigate to page requested:', pageNumber);
    setTargetPage(pageNumber);

    // Reset después de un breve delay para permitir múltiples navegaciones
    // Reset después de un breve delay para permitir múltiples navegaciones
    setTimeout(() => setTargetPage(undefined), 100);
  };

  // ✅ FASE 21.2: Escuchar eventos de navegación desde el chat
  const pdfNavigationTarget = useUI(s => s.pdfNavigationTarget);
  const selectedField = useUI(s => s.selectedField); // ✅ NUEVO

  React.useEffect(() => {
    if (pdfNavigationTarget && pdfNavigationTarget.page) {
      console.log('📄 [AnalysisTab] Navegando a página:', pdfNavigationTarget.page);
      setTargetPage(pdfNavigationTarget.page);

      // Limpiar el target después de usarlo para evitar bucles o estados inconsistentes
      // Usamos setTimeout para asegurar que el render ciclo se complete
      setTimeout(() => {
        useUI.setState({ pdfNavigationTarget: undefined });
      }, 500);
    }
  }, [pdfNavigationTarget]);

  if (!selectedAnalysis) {
    console.log('🔍 [AnalysisTab] RENDERING NO ANALYSIS MESSAGE', {
      timestamp: new Date().toISOString()
    });
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">
          Selecciona una póliza para ver su análisis
        </p>
      </div>
    );
  }

  console.log('🔍 [AnalysisTab] RENDERING PdfViewer', {
    timestamp: new Date().toISOString(),
    analysisId: selectedAnalysis.id,
    PdfViewerType: typeof PdfViewer,
    PdfViewerIsFunction: typeof PdfViewer === 'function',
    PdfViewerIsComponent: typeof PdfViewer === 'function' && PdfViewer.prototype?.isReactComponent !== undefined
  });

  return (
    <div className="flex h-full">
      {/* Panel Izquierdo: Visor PDF */}
      <div className="flex-1 relative">
        {(() => {
          console.log('🔍 [AnalysisTab] ABOUT TO RENDER PdfViewer JSX', {
            timestamp: new Date().toISOString(),
            analysisId: selectedAnalysis.id
          });
          try {
            return (
              <PdfViewer
                analysis={selectedAnalysis}
                {...(targetPage !== undefined && { initialPage: targetPage })}
                onPageChange={(page) => console.log('📄 [AnalysisTab] Page changed:', page)}
              />
            );
          } catch (err: any) {
            console.error('🔍 [AnalysisTab] ERROR rendering PdfViewer', {
              timestamp: new Date().toISOString(),
              error: err,
              errorMessage: err?.message,
              errorStack: err?.stack
            });
            throw err;
          }
        })()}
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


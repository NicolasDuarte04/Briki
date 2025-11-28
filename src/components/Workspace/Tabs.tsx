"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic"; // ✅ CORRECCIÓN CRÍTICA SSR
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { useUI } from "@/lib/ui/state";
import { ComplianceGate } from "./ComplianceGate";
import CaseBrief from "./CaseBrief";
import CaseBriefForm from "./CaseBriefForm";
import { CaseSummary } from "./CaseSummary";
import Policies from "./Policies";
import Comparison from "./Comparison";
import Proposal from "./Proposal";
import Renewals from "./Renewals";

// 🔍 LOG 1: Antes de crear dynamic import de AnalysisTab
console.log('🔍 [WorkspaceTabs] BEFORE AnalysisTab dynamic import creation', {
  timestamp: new Date().toISOString(),
  environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR',
  hasWindow: typeof window !== 'undefined',
  stackTrace: new Error().stack?.split('\n').slice(0, 10).join('\n')
});

// ✅ CORRECCIÓN CRÍTICA: Import dinámico de AnalysisTab para evitar SSR con pdfjs-dist
// Aunque PdfViewer ya es dinámico dentro de AnalysisTab, necesitamos que AnalysisTab
// también sea dinámico para que Next.js no intente evaluar el módulo durante SSR
const AnalysisTab = dynamic(
  () => {
    console.log('🔍 [WorkspaceTabs] AnalysisTab DYNAMIC IMPORT CALLBACK EXECUTING', {
      timestamp: new Date().toISOString(),
      environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR',
      hasWindow: typeof window !== 'undefined',
      stackTrace: new Error().stack?.split('\n').slice(0, 15).join('\n')
    });

    return import("@/components/Analysis/AnalysisTab").then(mod => {
      console.log('🔍 [WorkspaceTabs] AnalysisTab DYNAMIC IMPORT RESOLVED', {
        timestamp: new Date().toISOString(),
        environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR',
        hasAnalysisTab: typeof mod?.AnalysisTab !== 'undefined',
        modKeys: Object.keys(mod)
      });
      return { default: mod.AnalysisTab };
    }).catch(err => {
      console.error('🔍 [WorkspaceTabs] AnalysisTab DYNAMIC IMPORT ERROR', {
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
      console.log('🔍 [WorkspaceTabs] AnalysisTab LOADING component rendering', {
        timestamp: new Date().toISOString(),
        environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR'
      });
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Cargando análisis...</p>
        </div>
      );
    }
  }
);

// 🔍 LOG 2: Después de crear dynamic import
console.log('🔍 [WorkspaceTabs] AFTER AnalysisTab dynamic import creation', {
  timestamp: new Date().toISOString(),
  environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR',
  AnalysisTabType: typeof AnalysisTab
});

export type WorkspaceTab = "case-brief" | "policies" | "analysis" | "comparisons" | "proposal" | "compliance" | "renewals"; // ✅ FASE 5: Added "analysis"

interface CaseData {
  id: string;
  status: string;
  clientName?: string;
  businessType?: string;
  employees?: number;
  insurance_category?: string;
  max_budget?: number | string;
  budget_currency?: string;
  required_coverages?: string[];
  client_profile?: string;
  clientRef?: string;
  briefData?: any;
  artifacts?: any[];
}

export function WorkspaceTabs() {
  const t = useTranslations("workspace.tabs");
  const { caseApproved, brief, setCaseApproved, currentCaseId } = useUI();
  const fetchPolicyAnalyses = useUI(s => s.fetchPolicyAnalyses); // ✅ FASE 5
  const [activeCaseData, setActiveCaseData] = useState<CaseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // ✅ CORRECCIÓN: Estado local para forzar modo edición sin afectar caseApproved
  const [isEditingMode, setIsEditingMode] = useState(false);
  const tabLabels = useMemo(() => ({
    "case-brief": t("caseBrief"),
    policies: t("policies"),
    analysis: t("analysis"), // ✅ FASE 5
    comparisons: t("comparisons"),
    proposal: t("proposal"),
    compliance: t("compliance"),
    renewals: t("renewals"),
  } satisfies Record<WorkspaceTab, string>), [t]);
  const activeTab = useUI((state) => state.activeTab);
  const setActiveTab = useUI((state) => state.setActiveTab);
  const logRenewalsEvent = useUI((state) => state.logRenewalsEvent);

  // ✅ CORRECCIÓN: Resetear isEditingMode cuando cambia el caso
  useEffect(() => {
    setIsEditingMode(false);
  }, [currentCaseId]);

  // ✅ FASE 5: Cargar análisis de pólizas cuando cambia el caso
  useEffect(() => {
    if (currentCaseId && currentCaseId !== 'new-thread-placeholder') {
      fetchPolicyAnalyses(currentCaseId).catch(error => {
        console.error('❌ [WorkspaceTabs] Error fetching policy analyses:', error);
        // No romper la UI, solo loguear el error
      });
    }
  }, [currentCaseId, fetchPolicyAnalyses]);

  // ✅ FASE 6B: Auto-análisis de la primera póliza (Trigger Estructurado)
  // Si el caso está aprobado, tiene artifacts, pero NO tiene análisis estructurados,
  // disparamos el análisis automáticamente para que aparezca "Ver en PDF".
  const analyzePolicyArtifact = useUI(s => s.analyzePolicyArtifact);
  const policyAnalyses = useUI(s => s.policyAnalyses);

  useEffect(() => {
    if (
      caseApproved &&
      activeCaseData?.artifacts?.length &&
      activeCaseData.artifacts.length > 0 &&
      policyAnalyses.length === 0
    ) {
      const firstArtifact = activeCaseData.artifacts[0];
      // Solo si es PDF
      if (firstArtifact.contentType === 'application/pdf' || firstArtifact.fileName.toLowerCase().endsWith('.pdf')) {

        // ✅ FASE 22: Verificar si ya está en progreso
        const pending = useUI.getState()._pendingPolicyAnalysis || new Set();

        if (!pending.has(firstArtifact.id)) {
          console.log('🤖 [WorkspaceTabs] Auto-triggering structured analysis for first policy:', firstArtifact.id);
          analyzePolicyArtifact(firstArtifact.id).catch(err => {
            console.error('❌ [WorkspaceTabs] Auto-analysis failed:', err);
          });
        } else {
          console.log('⏭️ [WorkspaceTabs] Analysis already in progress, skipping auto-trigger:', firstArtifact.id);
        }
      }
    }
  }, [caseApproved, activeCaseData, policyAnalyses.length, analyzePolicyArtifact]);

  // ✅ FASE B.2: Cargar datos del caso cuando currentCaseId cambia
  useEffect(() => {
    if (currentCaseId) {
      // ✅ CORRECCIÓN: Evitar llamadas innecesarias si ya tenemos los datos
      if (activeCaseData?.id === currentCaseId) {
        console.log(`✅ [WorkspaceTabs] Datos del caso ${currentCaseId} ya cargados`);
        return;
      }

      const fetchCaseData = async () => {
        setIsLoading(true);
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            const response = await fetch(`/api/cases/${currentCaseId}`);
            if (response.ok) {
              const { case: caseData } = await response.json();
              setActiveCaseData(caseData);
              console.log(`✅ [WorkspaceTabs] Cargados datos del caso ${currentCaseId}`);

              // ✅ CORRECCIÓN: Sincronizar caseApproved y resetear caseApproving cuando se carga caso desde BD
              // IMPORTANTE: NO resetear caseApproved a false si ya está en true (evita condiciones de carrera)
              useUI.setState({ caseApproving: false });

              if (caseData.status === 'active') {
                // ✅ CORRECCIÓN CRÍTICA: Si el caso está activo, caseApproved DEBE ser true y NUNCA puede volverse false
                // Esto es una regla de negocio: casos activos siempre están aprobados
                setCaseApproved(true);
                console.log('✅ [WorkspaceTabs] Caso activo sincronizado desde BD, caseApproved=true (NUNCA puede volverse false)');
              } else {
                // Si el caso es 'draft', solo resetear caseApproved si NO está ya en true
                // IMPORTANTE: Si caseApproved ya es true, NO resetearlo (puede ser un caso que se aprobó pero BD aún no se actualizó)
                const currentCaseApproved = useUI.getState().caseApproved;
                if (!currentCaseApproved) {
                  setCaseApproved(false);
                  console.log('✅ [WorkspaceTabs] Caso draft sincronizado, caseApproved=false, caseApproving=false');
                } else {
                  console.log('⚠️ [WorkspaceTabs] Caso en draft pero caseApproved=true (probablemente recién aprobado), manteniendo true');
                  // NO resetear a false aquí, dejar que el monitor continuo maneje timeouts si es necesario
                }
              }

              break; // Éxito, salir del loop
            } else {
              // ✅ CORRECCIÓN: Manejo graceful de errores HTTP
              if (response.status >= 500 && retryCount < maxRetries - 1) {
                // Error del servidor, reintentar
                retryCount++;
                console.warn(`⚠️ [WorkspaceTabs] Error ${response.status} obteniendo datos del caso (intento ${retryCount}/${maxRetries}), reintentando...`);
                await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
                continue;
              } else {
                // Error del cliente (404) o máximo de reintentos alcanzado
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                console.error(`❌ [WorkspaceTabs] Error ${response.status} obteniendo datos del caso:`, errorData.error || response.statusText);
                // No romper la UI, solo loguear el error
                break;
              }
            }
          } catch (error: any) {
            retryCount++;
            if (retryCount < maxRetries) {
              console.warn(`⚠️ [WorkspaceTabs] Error obteniendo datos del caso (intento ${retryCount}/${maxRetries}):`, error.message);
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
              continue;
            } else {
              console.error('❌ [WorkspaceTabs] Error obteniendo datos del caso después de todos los reintentos:', error);
              // No romper la UI, el usuario puede seguir interactuando con el chat
              break;
            }
          }
        }

        setIsLoading(false);
      };
      fetchCaseData();
    } else {
      // ✅ FASE 2 REFORMULADA: Limpiar activeCaseData cuando no hay currentCaseId
      console.log('🧹 [WorkspaceTabs] Limpiando activeCaseData para new-thread-placeholder');
      setActiveCaseData(null);
    }
  }, [currentCaseId, activeCaseData?.id]); // ✅ CORRECCIÓN: Agregar activeCaseData?.id para evitar llamadas innecesarias

  // ✅ FASE 2: Determinar si mostrar resumen o formulario
  // Lógica: 
  // - new-thread-placeholder (currentCaseId === null) → mostrar formulario (shouldShowSummary = false)
  // - case-id con status='active' → mostrar resumen (shouldShowSummary = true) EXCEPTO si isEditingMode = true
  // - case-id con status='draft' → mostrar formulario (shouldShowSummary = false)
  const shouldShowSummary = useMemo(() => {
    // ✅ CORRECCIÓN: Si isEditingMode es true, SIEMPRE mostrar formulario (forzar edición)
    if (isEditingMode) {
      return false; // Mostrar formulario en modo edición
    }

    // ✅ CORRECCIÓN: Si no hay currentCaseId (new-thread-placeholder), SIEMPRE mostrar formulario
    if (!currentCaseId) {
      return false; // Mostrar formulario abierto para nuevo caso
    }

    // Si caseApproved es true, mostrar resumen (a menos que isEditingMode sea true, ya verificado arriba)
    if (caseApproved) return true;

    // Si activeCaseData existe y status es 'active', mostrar resumen
    if (activeCaseData && activeCaseData.status === 'active') {
      // Sincronizar caseApproved con status de BD solo una vez
      // (evitar loops infinitos)
      return true;
    }

    // Caso contrario: mostrar formulario (caso draft o sin datos)
    return false;
  }, [caseApproved, activeCaseData, currentCaseId, isEditingMode]);

  // ✅ CORRECCIÓN DOCUMENTADA: Sincronizar caseApproved con status de BD cuando activeCaseData cambia
  useEffect(() => {
    if (activeCaseData && activeCaseData.status === 'active' && !caseApproved) {
      console.log('🔄 [WorkspaceTabs] Sincronizando caseApproved con status de BD');
      setCaseApproved(true);
    }
  }, [activeCaseData, caseApproved, setCaseApproved]);

  // ✅ CORRECCIÓN DOCUMENTADA: Recargar activeCaseData cuando caseApproved cambia a true
  // Esto asegura que activeCaseData refleje el estado actualizado (status: 'active') después de aprobar
  useEffect(() => {
    if (caseApproved && currentCaseId) {
      // Evitar recarga si ya tenemos los datos y el status es 'active'
      if (activeCaseData?.id === currentCaseId && activeCaseData.status === 'active') {
        console.log('✅ [WorkspaceTabs] activeCaseData ya está sincronizado, omitiendo recarga');
        return;
      }

      console.log('🔄 [WorkspaceTabs] Recargando activeCaseData después de aprobación');
      const fetchCaseData = async () => {
        try {
          const response = await fetch(`/api/cases/${currentCaseId}`);
          if (response.ok) {
            const { case: caseData } = await response.json();
            setActiveCaseData(caseData);
            console.log(`✅ [WorkspaceTabs] Datos del caso recargados después de aprobación, status: ${caseData.status}`);
          }
        } catch (error: any) {
          console.error('❌ [WorkspaceTabs] Error recargando datos después de aprobación:', error);
        }
      };
      fetchCaseData();
    }
  }, [caseApproved, currentCaseId, activeCaseData?.id, activeCaseData?.status]);

  // ✅ NUEVA: Monitor continuo para sincronizar caseApproved con BD
  useEffect(() => {
    // Solo ejecutar si tenemos activeCaseData válido
    if (!activeCaseData || !activeCaseData.id) return;

    // ✅ REGLA DE NEGOCIO INVIOLABLE:
    // Si el caso en BD tiene status='active', caseApproved DEBE ser true
    // Si caseApproved es false pero status='active', CORREGIR inmediatamente

    if (activeCaseData.status === 'active' && !caseApproved) {
      console.warn('[WorkspaceTabs] 🚨 INCONSISTENCIA DETECTADA: Caso ACTIVO pero caseApproved=false - CORRIGIENDO');
      setCaseApproved(true);
    }

    // ✅ INVERSO: Si el caso es draft y caseApproved=true, verificar por cuánto tiempo
    // (puede ser un caso recién aprobado esperando actualización de BD)
    if (activeCaseData.status === 'draft' && caseApproved) {
      // Tolerancia: esperar 5 segundos máximo para que BD se actualice
      const timeoutId = setTimeout(async () => {
        try {
          // ✅ SOLUCIÓN: Re-fetch desde BD para verificar estado REAL
          // No confiamos en el estado local que puede estar desactualizado
          const response = await fetch(`/api/cases/${activeCaseData.id}`);
          
          if (!response.ok) {
            console.error('[WorkspaceTabs] ❌ Error al verificar caso:', response.status);
            return; // No resetear en caso de error de red
          }

          const { case: freshCaseData } = await response.json();
          const currentApproved = useUI.getState().caseApproved;

          // Verificar status FRESCO desde BD
          if (freshCaseData?.status === 'draft' && currentApproved) {
            console.warn('[WorkspaceTabs] ⚠️ Caso aún en DRAFT después de 5s (verificado desde BD)');
            console.warn('[WorkspaceTabs] Probable fallo de API o BD muy lenta, permitiendo reintento');
            // Solo en este caso específico permitimos resetear para que el usuario reintente
            setCaseApproved(false); 
          } else if (freshCaseData?.status === 'active') {
            console.log('[WorkspaceTabs] ✅ Caso ACTIVE confirmado desde BD');
            // Actualizar activeCaseData local con datos frescos para que la UI se actualice
            setActiveCaseData(freshCaseData);
            // caseApproved ya es true, mantenerlo (NO resetear)
          }
        } catch (error: any) {
          console.error('[WorkspaceTabs] ❌ Error verificando status del caso:', error.message);
          // En caso de error de red, NO resetear caseApproved
          // Es mejor quedarse con botones ocultos que arriesgarse a doble aprobación
        }
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [activeCaseData?.status, activeCaseData?.id, caseApproved, setCaseApproved]);

  // Función para volver al modo de edición
  // ✅ CORRECCIÓN: Activar modo edición sin afectar caseApproved
  // Usamos isEditingMode para forzar el formulario sin resetear caseApproved
  const handleEditBrief = () => {
    setIsEditingMode(true);
    console.log('✏️ [WorkspaceTabs] Modo edición activado (isEditingMode=true) - mostrando formulario');
  };

  // ✅ CORRECCIÓN: Función para desactivar modo edición después de guardar
  // Esta función se pasará a CaseBriefForm para que pueda volver al resumen después de guardar
  const handleEditComplete = useCallback(() => {
    setIsEditingMode(false);
    console.log('✅ [WorkspaceTabs] Modo edición completado (isEditingMode=false) - mostrando resumen');

    // ✅ CORRECCIÓN: Recargar datos del caso para incluir nuevos artifacts y datos actualizados
    if (currentCaseId) {
      const fetchCaseData = async () => {
        try {
          const response = await fetch(`/api/cases/${currentCaseId}`);
          if (response.ok) {
            const { case: caseData } = await response.json();
            setActiveCaseData(caseData);
            console.log('✅ [WorkspaceTabs] Datos del caso recargados después de editar, incluyendo nuevos artifacts');
          }
        } catch (error) {
          console.warn('⚠️ [WorkspaceTabs] Error recargando datos después de editar:', error);
        }
      };
      fetchCaseData();
    }
  }, [currentCaseId]);

  const handleTabChange = useCallback((value: string) => {
    const nextTab = value as WorkspaceTab;
    setActiveTab(nextTab);
    if (nextTab === "renewals") {
      logRenewalsEvent("RenewalsViewOpen");
    }
  }, [logRenewalsEvent]);

  return (
    <div className="w-full h-full flex flex-col">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex h-full min-h-0 flex-col"
      >
        <div className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
          <TabsList className="w-full justify-start gap-2" role="tablist" aria-label={t("ariaLabel")}>
            {(Object.keys(tabLabels) as WorkspaceTab[]).map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {tabLabels[tab]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="flex-1 overflow-y-auto px-6 md:px-8">
          <TabsContent value="case-brief" className="py-6 h-full">
            {shouldShowSummary ? (
              <CaseSummary brief={brief} activeCaseData={activeCaseData} onEdit={handleEditBrief} />
            ) : (
              // ✅ CORRECCIÓN: Spread condicional para respetar exactOptionalPropertyTypes
              // - Cuando isEditingMode=true: onEditComplete está presente en props
              // - Cuando isEditingMode=false: onEditComplete no existe en props (omitida completamente)
              // - Esto permite volver al resumen después de guardar en modo edición
              // - Patrón consistente con CaseBriefForm pasando onApprove a BriefForm
              <CaseBriefForm
                initialData={activeCaseData?.briefData || brief}
                activeCaseData={activeCaseData}
                {...(isEditingMode && { onEditComplete: handleEditComplete })}
                isEditingMode={isEditingMode}
              />
            )}
          </TabsContent>
          <TabsContent value="policies" className="py-6">
            <Policies caseData={activeCaseData} loading={isLoading} />
          </TabsContent>
          <TabsContent value="analysis" className="py-6 h-full">
            {(() => {
              console.log('🔍 [WorkspaceTabs] ABOUT TO RENDER AnalysisTab JSX', {
                timestamp: new Date().toISOString(),
                activeTab,
                environment: typeof window !== 'undefined' ? 'CLIENT' : 'SSR',
                AnalysisTabType: typeof AnalysisTab,
                stackTrace: new Error().stack?.split('\n').slice(0, 15).join('\n')
              });
              try {
                return <AnalysisTab />;
              } catch (err: any) {
                console.error('🔍 [WorkspaceTabs] ERROR rendering AnalysisTab', {
                  timestamp: new Date().toISOString(),
                  error: err,
                  errorMessage: err?.message,
                  errorStack: err?.stack
                });
                throw err;
              }
            })()}
          </TabsContent>
          <TabsContent value="comparisons" className="py-6">
            <Comparison />
          </TabsContent>
          <TabsContent value="proposal" className="py-6">
            <Proposal />
          </TabsContent>
          <TabsContent value="compliance" className="py-6">
            <ComplianceGate />
          </TabsContent>
          <TabsContent value="renewals" className="py-6">
            <Renewals />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default WorkspaceTabs;



"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic"; // ✅ CORRECCIÓN CRÍTICA SSR
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { useUI } from "@/lib/ui/state";
import { ComplianceGate } from "./ComplianceGate";
import ComplianceModal from "./ComplianceModal";
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

interface WorkspaceTabsProps {
  orgId?: string | undefined; // ✅ CORRECCIÓN: orgId desde SSR para evitar race condition en PdfUploader
}

export function WorkspaceTabs({ orgId }: WorkspaceTabsProps = {}) {
  const t = useTranslations("workspace.tabs");
  const { caseApproved, brief, setCaseApproved, currentCaseId } = useUI();
  // ✅ TRANSICIÓN ATÓMICA: Obtener approvalPhase para overlay persistente
  const approvalPhase = useUI(s => s.approvalPhase);
  const caseApproving = useUI(s => s.caseApproving);
  const fetchPolicyAnalyses = useUI(s => s.fetchPolicyAnalyses); // ✅ FASE 5
  const policyAnalysesLoaded = useUI(s => s.policyAnalysesLoaded); // ✅ CORRECCIÓN: Para detectar cuando recargar
  const policyAnalysesLoading = useUI(s => s.policyAnalysesLoading); // ✅ CORRECCIÓN: Para evitar llamadas duplicadas
  // ✅ FASE 32: Compliance
  const loadComplianceRecord = useUI(s => s.loadComplianceRecord);
  const hydrateComplianceDatesFromPolicies = useUI(s => s.hydrateComplianceDatesFromPolicies); // ✅ Auto-hidratar fechas
  // ✅ FASE 4 RENOVACIONES: Cargar renovaciones reales
  const fetchRenewals = useUI(s => s.fetchRenewals);
  // ✅ FASE 38: Load historical comparisons and proposals
  const loadComparisons = useUI(s => s.loadComparisons);
  const loadProposalByCase = useUI(s => s.loadProposalByCase);
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

  // ✅ FASE 32 CORREGIDA: Lazy loading de compliance - solo cargar cuando el tab está activo
  // Esto evita errores 500 para casos nuevos que aún no tienen registro de compliance
  useEffect(() => {
    if (activeTab === 'compliance' && currentCaseId && currentCaseId !== 'new-thread-placeholder') {
      loadComplianceRecord(currentCaseId).catch(error => {
        // Solo loguear si es un error real, no si es un caso nuevo sin compliance
        console.warn('⚠️ [WorkspaceTabs] Error fetching compliance record (puede ser normal para casos nuevos):', error);
      });
      // ✅ Auto-hidratar fechas de vigencia desde pólizas analizadas
      hydrateComplianceDatesFromPolicies();
    }
  }, [activeTab, currentCaseId, loadComplianceRecord, hydrateComplianceDatesFromPolicies]);

  // ✅ FASE 4 RENOVACIONES: Cargar renovaciones cuando cambia el caso
  useEffect(() => {
    if (currentCaseId && currentCaseId !== 'new-thread-placeholder') {
      console.log('📋 [WorkspaceTabs] Loading renewals for case:', currentCaseId);
      fetchRenewals(currentCaseId).catch(error => {
        console.error('❌ [WorkspaceTabs] Error fetching renewals:', error);
      });
    }
  }, [currentCaseId, fetchRenewals]);

  // ✅ FASE 5 + CORRECCIÓN: Cargar análisis de pólizas cuando cambia el caso O cuando loaded=false
  // CRÍTICO: También reaccionar a policyAnalysesLoaded=false para cubrir el caso donde:
  // 1. currentCaseId se establece antes de que el componente se monte
  // 2. El componente se monta después de la navegación pero los datos no están cargados
  useEffect(() => {
    if (currentCaseId && currentCaseId !== 'new-thread-placeholder' && !policyAnalysesLoaded && !policyAnalysesLoading) {
      console.log('🔄 [WorkspaceTabs] Fetching policy analyses - caseId:', currentCaseId, 'loaded:', policyAnalysesLoaded);
      fetchPolicyAnalyses(currentCaseId).catch(error => {
        console.error('❌ [WorkspaceTabs] Error fetching policy analyses:', error);
        // No romper la UI, solo loguear el error
      });
    }
  }, [currentCaseId, policyAnalysesLoaded, policyAnalysesLoading, fetchPolicyAnalyses]);

  // ✅ FASE 38 + REFORMULATION: Cargar comparaciones históricas cuando cambia el caso
  useEffect(() => {
    if (currentCaseId && currentCaseId !== 'new-thread-placeholder') {
      loadComparisons(currentCaseId).catch(error => {
        console.error('❌ [WorkspaceTabs] Error fetching comparisons:', error);
      });
    }
  }, [currentCaseId, loadComparisons]);

  // ✅ FASE 38: Cargar propuesta histórica cuando cambia el caso
  useEffect(() => {
    if (currentCaseId && currentCaseId !== 'new-thread-placeholder') {
      loadProposalByCase(currentCaseId).catch(error => {
        console.error('❌ [WorkspaceTabs] Error fetching proposal:', error);
      });
    }
  }, [currentCaseId, loadProposalByCase]);

  // ✅ REESTRUCTURACIÓN: Auto-análisis ELIMINADO
  // El análisis de pólizas ahora es manual desde el tab "Pólizas"
  // usando el botón "Analizar PDF" o "Cargar Análisis"
  // Esto da al usuario control total sobre cuándo y qué póliza analizar

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

              // ✅ CORRECCIÓN CRÍTICA: Sincronizar estados SIN resetear caseApproved si ya está en true
              // Esto evita el "flickering" de botones durante navegación
              const currentCaseApproved = useUI.getState().caseApproved;
              
              // ✅ REGLA FUNDAMENTAL: caseApproved = true es DEFINITIVO para esta sesión de caso
              // Una vez aprobado, NUNCA debe volver a false (evita re-aparición de botones)
              const finalCaseApproved = currentCaseApproved === true 
                ? true  // Preservar si ya estaba aprobado
                : (caseData.status === 'active');  // Solo de BD si no estaba aprobado
              
              useUI.setState({ 
                caseApproving: false,
                caseApproved: finalCaseApproved
              });
              
              if (caseData.status === 'active') {
                console.log('✅ [WorkspaceTabs] Caso activo sincronizado, caseApproved=true (NUNCA puede volverse false)');
              } else if (currentCaseApproved) {
                console.log('⚠️ [WorkspaceTabs] Caso draft pero caseApproved=true (recién aprobado), preservando estado');
              } else {
                console.log('✅ [WorkspaceTabs] Caso draft sincronizado, caseApproved=false');
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

  // ✅ TRANSICIÓN ATÓMICA: Detectar si estamos en medio de una transición
  // Durante 'processing', mostramos overlay a nivel de Tabs (no depende de componentes hijos)
  const isTransitioning = approvalPhase === 'processing' || caseApproving;

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
            
            // ✅ CORRECCIÓN: Refrescar policyAnalyses para sincronizar tab "Pólizas"
            // Esto permite que las nuevas pólizas añadidas aparezcan disponibles para análisis
            const { fetchPolicyAnalyses } = useUI.getState();
            await fetchPolicyAnalyses(currentCaseId);
            console.log('✅ [WorkspaceTabs] Tab Pólizas refrescado con nuevos artifacts');
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
    <div className="w-full h-full flex flex-col relative">
      {/* ✅ TRANSICIÓN ATÓMICA: Overlay a nivel de Tabs que persiste durante navegación */}
      {isTransitioning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-xl shadow-lg border">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <div className="text-center">
              <p className="font-semibold text-foreground text-lg">Creando caso...</p>
              <p className="text-sm text-muted-foreground mt-1">Por favor espera un momento</p>
            </div>
          </div>
        </div>
      )}
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
                {...(orgId && { orgId })} // ✅ CORRECCIÓN: Solo pasar orgId si está definido
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
            <Comparison caseData={activeCaseData} />
          </TabsContent>
          <TabsContent value="proposal" className="py-6">
            <Proposal />
          </TabsContent>
          <TabsContent value="compliance" className="py-6">
            <ComplianceGate />
            <ComplianceModal />
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



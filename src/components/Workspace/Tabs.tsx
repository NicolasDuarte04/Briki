"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
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

export type WorkspaceTab = "case-brief" | "policies" | "comparisons" | "proposal" | "compliance" | "renewals";

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
  const [activeCaseData, setActiveCaseData] = useState<CaseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const tabLabels = useMemo(() => ({
      "case-brief": t("caseBrief"),
      policies: t("policies"),
      comparisons: t("comparisons"),
      proposal: t("proposal"),
      compliance: t("compliance"),
      renewals: t("renewals"),
    } satisfies Record<WorkspaceTab, string>), [t]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("case-brief");
  const logRenewalsEvent = useUI((state) => state.logRenewalsEvent);

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
  const shouldShowSummary = useMemo(() => {
    // Si caseApproved es true, siempre mostrar resumen
    if (caseApproved) return true;
    
    // Si activeCaseData existe y status es 'active', mostrar resumen
    if (activeCaseData && activeCaseData.status === 'active') {
      // Sincronizar caseApproved con status de BD solo una vez
      // (evitar loops infinitos)
      return true;
    }
    
    // Caso contrario: mostrar formulario
    return false;
  }, [caseApproved, activeCaseData]);

  // ✅ FASE 2: Sincronizar caseApproved con status de BD cuando activeCaseData cambia
  useEffect(() => {
    if (activeCaseData && activeCaseData.status === 'active' && !caseApproved) {
      console.log('🔄 [WorkspaceTabs] Sincronizando caseApproved con status de BD');
      setCaseApproved(true);
    }
  }, [activeCaseData, caseApproved, setCaseApproved]);

  // Función para volver al modo de edición (resetea el estado de aprobación)
  const handleEditBrief = () => {
    setCaseApproved(false);
  };

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
              <CaseSummary brief={brief} onEdit={handleEditBrief} />
            ) : (
              <CaseBriefForm 
                initialData={activeCaseData?.briefData || brief} 
                activeCaseData={activeCaseData} 
              />
            )}
          </TabsContent>
          <TabsContent value="policies" className="py-6">
            <Policies caseData={activeCaseData} loading={isLoading} />
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



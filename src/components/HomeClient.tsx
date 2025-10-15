"use client";

import { useEffect, useRef, useState } from "react";
import Canvas from "@/components/Canvas";
import Hotkeys from "@/components/Hotkeys";
import Landing from "@/components/Landing";
import FooterNav from "@/components/FooterNav";
import { useUI, type UIStep } from "@/lib/ui/state";
import { motion, AnimatePresence } from "framer-motion";
import BrikiSidebarLayout from "@/components/BrikiSidebarLayout";
import SidebarNav from "@/components/SidebarNav";
import SidebarChatPanel from "@/components/SidebarChatPanel";
import WorkspaceTabs from "@/components/Workspace/Tabs";
import CaseBrief from "@/components/Workspace/CaseBrief";
import SourcingProgressWidget from "@/components/Sourcing/SourcingProgressWidget";
import HotkeysGuide from "@/components/HotkeysGuide";
import dynamic from "next/dynamic";
import { ComplianceGate } from "@/components/Workspace/ComplianceGate";
import BrikiLandingNavbar from "@/components/BrikiLandingNavbar";
import { BriefForm, CaseBriefData } from "@/components/Cases/BriefForm";

const ConversationPane = dynamic(() => import("@/components/Chat/ConversationPane"), { ssr: false });

export default function HomeClient({ initialStep }: { initialStep: UIStep }) {
  const initializedRef = useRef(false);
  const { step, rightOpen, toggleRight, primaryAction, setStep, isSourcing, stopSourcing, chatPanelOpen, cases, fetchCases, briefingCase, startBriefing, completeBriefing, cancelBriefing } = useUI();
  const currentStep = initializedRef.current ? step : initialStep;
  
  // Estado para verificar autenticación
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    // Only set the step once on mount, without reading step from state
    if (initialStep) {
      setStep(initialStep);
    }

    initializedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStep, setStep]);

  // Load cases when chat panel opens
  useEffect(() => {
    if (chatPanelOpen) {
      fetchCases();
    }
  }, [chatPanelOpen, fetchCases]);

  // Verificar autenticación cuando se active el briefing
  useEffect(() => {
    if (briefingCase?.isActive) {
      const checkAuth = async () => {
        setAuthLoading(true);
        try {
          const response = await fetch('/api/auth/me');
          if (response.ok) {
            const userData = await response.json();
            if (userData.orgId && userData.userId) {
              setIsAuthenticated(true);
            } else {
              setIsAuthenticated(false);
            }
          } else {
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Error checking auth:', error);
          setIsAuthenticated(false);
        } finally {
          setAuthLoading(false);
        }
      };
      checkAuth();
    }
  }, [briefingCase?.isActive]);

  // Función para manejar el envío del BriefForm
  const handleBriefSubmit = async (data: CaseBriefData) => {
    try {
      // Obtener información del usuario autenticado
      const userResponse = await fetch('/api/auth/me');
      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          // Usuario no autenticado, redirigir al login
          window.location.href = '/login';
          return;
        }
        throw new Error('No se pudo obtener información del usuario');
      }
      const userData = await userResponse.json();
      
      if (!userData.orgId || !userData.userId) {
        throw new Error('Usuario no está asociado a una organización');
      }

      const response = await fetch('/api/cases/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // IDs requeridos por la API
          orgId: userData.orgId,
          userId: userData.userId,
          // Mapear los datos del BriefForm a la estructura que espera la API
          clientName: data.clientName,
          businessType: data.businessType,
          employees: data.employees,
          status: 'draft',
          stage: 'initial',
          priority: 'medium',
          briefData: {
            freeText: data.notes,
            businessType: data.businessType,
            employees: data.employees,
            coverage: data.coverage,
          },
          // Nuevos campos del Brief detallado
          insurance_category: data.insurance_category,
          max_budget: data.max_budget,
          budget_currency: data.budget_currency,
          required_coverages: data.required_coverages,
          client_profile: data.client_profile,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el caso');
      }

      const result = await response.json();
      
      // Completar el briefing y proceder a la conversación
      completeBriefing(result.id);
    } catch (error) {
      console.error('Error creating case from briefing:', error);
      // En caso de error, cancelar el briefing
      cancelBriefing();
    }
  };

  const steps: UIStep[] = [
    "landing",
    "conversation",
    "sourcing",
    "normalized",
    "comparison",
    "proposal",
    "compliance",
    "followups",
  ];

  return (
    <div className="h-dvh min-h-0 w-full flex flex-col overflow-hidden">
      <Hotkeys
        primaryAction={primaryAction}
        onToggleRightPanel={toggleRight}
        onSetStep={(index) => {
          const next = steps[index - 1];
          if (next) setStep(next);
        }}
      />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {briefingCase?.isActive ? (
            <motion.div
              key="briefing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative flex-1 overflow-auto bg-background"
            >
              <div className="container mx-auto py-8 px-4 max-w-6xl">
                <div className="flex items-center gap-4 mb-8">
                  <button
                    onClick={cancelBriefing}
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    ← Volver
                  </button>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">Completa los Detalles</h1>
                    <p className="text-muted-foreground mt-1">
                      Proporciona información adicional para obtener mejores recomendaciones
                    </p>
                  </div>
                </div>
                
                {authLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Verificando autenticación...</p>
                    </div>
                  </div>
                ) : isAuthenticated === false ? (
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-4">Inicia sesión para continuar</h2>
                    <p className="text-muted-foreground mb-6">
                      Necesitas estar autenticado para crear un caso.
                    </p>
                    <button
                      onClick={() => window.location.href = '/login'}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Ir al Login
                    </button>
                  </div>
                ) : (
                  <BriefForm 
                    onSubmit={handleBriefSubmit} 
                    initialNotes={briefingCase.initialMessage}
                    isSubmitting={false}
                  />
                )}
              </div>
            </motion.div>
          ) : currentStep === "landing" ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="landing-scroll relative flex-1 overflow-auto"
            >
              <Landing />
            </motion.div>
          ) : (
            <motion.div
              key="conversation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative z-10 flex flex-1 flex-col bg-background min-h-0 overflow-hidden"
            >
              <BrikiSidebarLayout sidebar={chatPanelOpen ? <SidebarChatPanel cases={cases} /> : <SidebarNav />}>
                <Canvas
                  rightOpen={rightOpen}
                  isSourcing={isSourcing}
                  left={
                    currentStep === "conversation" || currentStep === "compliance" ? (
                      <ConversationPane />
                    ) : (
                      <div className="flex h-full flex-col justify-start">Current step: {currentStep}</div>
                    )
                  }
                  right={(() => {
                    if (currentStep === "conversation") {
                      return isSourcing ? (
                        <div className="flex h-full min-h-0 flex-col gap-4">
                          <SourcingProgressWidget compact onStop={stopSourcing} />
                          <div className="flex flex-1 min-h-0 flex-col">
                            <CaseBrief />
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full flex-col">
                          <WorkspaceTabs />
                        </div>
                      );
                    }

                    if (currentStep === "compliance") {
                      return (
                        <div className="flex h-full flex-col">
                          <ComplianceGate />
                        </div>
                      );
                    }

                    return <div className="flex h-full flex-col">Workspace for step: {currentStep}</div>;
                  })()}
                />
              </BrikiSidebarLayout>
              <FooterNav className="mt-4" fullBleed />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-4 left-4 z-50">
        <HotkeysGuide />
      </div>
    </div>
  );
}

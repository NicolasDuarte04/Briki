"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Canvas from "@/components/Canvas";
import Hotkeys from "@/components/Hotkeys";
import Landing from "@/components/Landing";
import FooterNav from "@/components/FooterNav";
import { useUI, type UIStep } from "@/lib/ui/state";
import { motion, AnimatePresence } from "framer-motion";
import WorkspaceTabs from "@/components/Workspace/Tabs";
import CaseBrief from "@/components/Workspace/CaseBrief";
import SourcingProgressWidget from "@/components/Sourcing/SourcingProgressWidget";
import HotkeysGuide from "@/components/HotkeysGuide";
import dynamic from "next/dynamic";
import { ComplianceGate } from "@/components/Workspace/ComplianceGate";
import BrikiLandingNavbar from "@/components/BrikiLandingNavbar";
import { BriefForm, CaseBriefData } from "@/components/Cases/BriefForm";

const ConversationPane = dynamic(() => import("@/components/Chat/ConversationPane"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Cargando conversación...</div>
});

interface HomeClientProps {
  initialStep?: UIStep;
  threadId?: string;
}

export default function HomeClient({ initialStep = "landing", threadId }: HomeClientProps) {
  const initializedRef = useRef(false);
  const pathname = usePathname(); // ✅ FASE 2: Obtener pathname para verificación de ruta
  const { step, rightOpen, toggleRight, primaryAction, setStep, isSourcing, stopSourcing, briefingCase, startBriefing, completeBriefing, cancelBriefing, setInitialMessage, initialMessage, currentCaseId, setCurrentCaseId, setMessages, setBrief } = useUI();
  // Usar el valor del store como fuente de verdad para la lógica de renderizado
  const currentStep = step; // Leer siempre desde Zustand después de la sincronización
  
  // Debug: Log the values to see what's happening
  console.log('HomeClient Debug:', { 
    currentStep, 
    rightOpen, 
    isSourcing, 
    initialStep,
    step
  });
  
  // Estado para verificar autenticación
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- SINCRONIZACIÓN DE ESTADO ---
  useEffect(() => {
    // Solo actualiza si initialStep tiene un valor y es DIFERENTE del step actual en Zustand
    if (initialStep && initialStep !== step) {
      console.log(`Syncing Zustand step: from '${step}' to initialStep '${initialStep}'`);
      setStep(initialStep);
    }
    // Depende solo de initialStep y setStep (que es estable).
    // NO incluir 'step' aquí para evitar el ciclo si initialStep no cambia.
  }, [initialStep, setStep]);

  // --- LÓGICA CONDICIONAL BASADA EN threadId ---
  useEffect(() => {
    if (threadId === 'new-thread-placeholder') {
      console.warn('🧹 [HomeClient] Limpieza exhaustiva para new-thread-placeholder');
      
      // ✅ BATCH UPDATE con delay para que se ejecute después de la sincronización
      setTimeout(() => {
        const state = useUI.getState();
        state.setCurrentCaseId(null);
        state.setMessages([]);
        state.setBrief({
          freeText: '',
          clientName: '',
          selectedClientId: null,
          insurance_category: '',
          budget_currency: 'COP',
          required_coverages: [],
          client_profile: '',
          businessType: '',
          coverage: '',
          tempUploads: [] // ✅ CORRECCIÓN: Limpiar PDFs residuales
          // Omitimos employees y max_budget en lugar de establecerlos como undefined
        });
        state.setInitialMessage('');
        state.setStep('conversation');
        // ✅ CORRECCIÓN CRÍTICA: Resetear caseApproved a false para new-thread-placeholder
        // Esto asegura que el formulario se muestre abierto (no el resumen)
        state.setCaseApproved(false);
        
        console.log('✅ [HomeClient] Estado completamente limpiado (con delay), caseApproved reseteado a false');
      }, 100); // Delay de 100ms para que se ejecute después de la sincronización
    } else if (threadId && threadId !== 'new-thread-placeholder') {
      // ✅ CORRECCIÓN CRÍTICA: Establecer currentCaseId desde threadId cuando es un caseId real
      // Esto es necesario después de recarga de página (window.location.href)
      const currentState = useUI.getState();
      if (currentState.currentCaseId !== threadId) {
        console.log(`🔄 [HomeClient] Estableciendo currentCaseId desde threadId: ${threadId}`);
        setCurrentCaseId(threadId);
        setStep('conversation');
        
        // ✅ CORRECCIÓN: Resetear caseApproving al cargar caso desde URL
        // IMPORTANTE: NO resetear caseApproved aquí, se sincronizará desde BD en WorkspaceTabs
        useUI.setState({ caseApproving: false });
        console.log('✅ [HomeClient] caseApproving reseteado al cargar caso desde URL (caseApproved se mantiene)');
      }
    }
  }, [threadId, setCurrentCaseId, setStep]);

  // --- MENSAJE DE BIENVENIDA DEL AGENTE ---
  // Este mensaje se maneja directamente en ConversationPane, no aquí
  // El initialMessage solo se usa para mensajes del usuario (desde LandingPage)


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
      completeBriefing(result.caseId);
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
    <div className="h-dvh min-h-0 w-full flex flex-col overflow-auto">
      <Hotkeys
        primaryAction={primaryAction}
        onToggleRightPanel={toggleRight}
        onSetStep={(index) => {
          const next = steps[index - 1];
          if (next) setStep(next);
        }}
      />
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        <AnimatePresence mode="wait">
          {briefingCase?.isActive ? (
            <div className="relative flex-1 overflow-auto bg-background">
              <motion.div
                key="briefing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
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
            </div>
          ) : (() => {
            // ✅ FASE 2: Verificación de ruta para prevenir renderizado incorrecto
            // Estamos en una ruta de agente si el pathname incluye '/agent'
            const isAgentRoute = pathname?.includes('/agent') || false;
            // Solo mostrar Landing si el step es "landing" Y NO estamos en una ruta de agente
            const shouldRenderLanding = currentStep === "landing" && !isAgentRoute;
            
            return shouldRenderLanding;
          })() ? (
            <div className="landing-scroll relative flex-1 overflow-auto">
              <motion.div
                key="landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <Landing />
              </motion.div>
            </div>
          ) : (
            <div className="relative z-10 flex flex-1 flex-col bg-background min-h-0 overflow-auto">
              <motion.div
                key="conversation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
              {/* Solo mostrar Canvas para steps que requieren el panel izquierdo */}
              {(currentStep === "conversation" || currentStep === "compliance" || currentStep === "sourcing") ? (
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
                    // --- MODIFICACIÓN CLAVE ---
                    if (currentStep === "conversation" || isSourcing) { // Mostrar panel derecho en conversación Y sourcing
                      return (
                        <div className="flex h-full flex-col overflow-hidden">
                          {/* Widget de progreso: Se muestra solo si isSourcing es true */}
                          {isSourcing && (
                            <div className="flex-shrink-0 border-b border-border/50 p-2">
                              {/* Asegúrate que SourcingProgressWidget acepte estas props */}
                              <SourcingProgressWidget compact onStop={stopSourcing} />
                            </div>
                          )}

                          {/* Panel de Tabs: Siempre visible en este flujo */}
                          <div className="flex-1 min-h-0 overflow-y-auto">
                            {/* WorkspaceTabs necesita acceso al caseId actual, asegúrate que lo reciba */}
                            <WorkspaceTabs />
                          </div>
                        </div>
                      );
                    }

                    // Mantener la lógica para otros steps si existen
                    if (currentStep === "compliance") {
                      return (
                        <div className="flex h-full flex-col">
                          <ComplianceGate />
                        </div>
                      );
                    }
                    // Fallback o lógica para otros steps
                    return <div className="p-4">Panel derecho para: {currentStep}</div>;
                  })()}
                />
              ) : (
                // Para otros steps, mostrar solo el contenido sin Canvas
                <div className="flex h-full flex-col justify-start p-4">
                  <div>Current step: {currentStep}</div>
                </div>
              )}
              <FooterNav className="mt-4" fullBleed />
            </motion.div>
          </div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-4 left-4 z-50">
        <HotkeysGuide />
      </div>
    </div>
  );
}

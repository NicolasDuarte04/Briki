"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { toast } from "sonner";
import { useUI, type UIState } from "@/lib/ui/state";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendHorizonal, ArrowDown, Loader2, Info } from "lucide-react";
import Message, { type MessageRole, type MessageAgentMeta } from "@/components/Chat/Message";
import { useTranslations, useLocale } from "next-intl";
import { useClientValidation } from "@/hooks/useClientValidation";
import { createCaseIfNeeded } from "@/lib/case-actions";
import { ClientValidationModal } from "@/components/Workspace/ClientValidationModal";
import { useRouter } from "next/navigation";
import { ChatMessage as BaseChatMessage } from "@/store/useChatStore";
// Removemos el import que no funciona en el browser
// import { processChatMessage } from "@/lib/database";

// Tipo local que extiende ChatMessage para soportar React.ReactNode
type ChatMessage = Omit<BaseChatMessage, 'content'> & {
  content: string | React.ReactNode;
};

const ConversationPane: React.FC<{ className?: string }> = ({ className }) => {
  const brief = useUI((state: UIState) => state.brief);
  const initialMessage = useUI((state: UIState) => state.initialMessage);
  const clearInitialMessage = useUI((state: UIState) => state.clearInitialMessage);
  const setInitialMessage = useUI((state: UIState) => state.setInitialMessage);
  const approveCurrentCase = useUI((state: UIState) => state.approveCurrentCase);

  // ✅ CORRECCIÓN: Usar selectores individuales para evitar loops infinitos (sin useShallow)
  const caseApproving = useUI((state: UIState) => state.caseApproving);
  const caseResolvingClient = useUI((state: UIState) => state.caseResolvingClient);
  const caseApproved = useUI((state: UIState) => state.caseApproved);
  const isBriefValid = useUI((state: UIState) => state.isBriefValid);
  const shouldShowApprovalButtons = useUI((state: UIState) => state.shouldShowApprovalButtons);
  const areApprovalButtonsEnabled = useUI((state: UIState) => state.areApprovalButtonsEnabled);
  const approvalPhase = useUI((state: UIState) => state.approvalPhase);

  // Debug logging for button visibility


  const briefingCase = useUI((state: UIState) => state.briefingCase);
  // ✅ CORRECCIÓN CRÍTICA: Usar selectores individuales para evitar loops infinitos
  // NO usar ({...}) porque crea un nuevo objeto en cada render
  const currentCaseId = useUI((state: UIState) => state.currentCaseId);
  const setCurrentCaseId = useUI((state: UIState) => state.setCurrentCaseId);

  // Debug logging for button visibility (MOVED HERE to avoid ReferenceError)
  useEffect(() => {
    // Solo loguear si estamos en un caso o new-thread-placeholder
    if (currentCaseId) {
      console.log('🔍 [ConversationPane] State update:', {
        approvalPhase,
        shouldShow: shouldShowApprovalButtons(),
        enabled: areApprovalButtonsEnabled(),
        category: brief?.insurance_category,
        currentCaseId
      });
    }
  }, [approvalPhase, brief?.insurance_category, currentCaseId, shouldShowApprovalButtons, areApprovalButtonsEnabled]);

  // Usar estado global de mensajes
  const messages = useUI((state: UIState) => state.messages);
  const addMessage = useUI((state: UIState) => state.addMessage);
  const setMessages = useUI((state: UIState) => state.setMessages);
  // setValidateAndApproveClient removido para evitar bucles infinitos

  // ✅ ELIMINADO: Estado local isResolvingClient - ahora se usa caseResolvingClient global de Zustand

  // Estado local para indicador de análisis de OpenAI
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Hook para validación de clientes (movido al nivel superior)
  // ✅ FASE 7: Hook para validación con modal (unificado con BriefForm y CaseBriefForm)
  const { validateAndResolveClient, modalState, setModalState } = useClientValidation(true);
  const router = useRouter();
  const locale = useLocale();

  // Cache para evitar validaciones repetidas del mismo cliente
  const [validatedClientCache, setValidatedClientCache] = useState<Map<string, string>>(new Map());

  // ✅ FASE 2.1: Función para guardar mensajes en BD
  const saveMessageToDB = useCallback(async (message: ChatMessage) => {
    const currentCaseId = useUI.getState().currentCaseId;
    if (!currentCaseId) {
      console.warn('⚠️ [ConversationPane] No case ID, skipping DB save');
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`💾 [ConversationPane] Saving message to DB (attempt ${retryCount + 1}/${maxRetries}):`, message.id);

        const response = await fetch(`/api/cases/${currentCaseId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: message.role,
            content: typeof message.content === 'string'
              ? message.content
              : JSON.stringify(message.content),
            metadata: {
              agent: message.agent?.label,
              messageId: message.id,
              timestamp: message.createdAt
            }
          })
        });

        if (response.ok) {
          console.log('✅ [ConversationPane] Message saved successfully');
          break; // Éxito, salir del loop
        } else {
          // ✅ CORRECCIÓN: Reintentar en errores 500 (problemas del servidor)
          if (response.status >= 500 && retryCount < maxRetries - 1) {
            retryCount++;
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            console.warn(`⚠️ [ConversationPane] Error ${response.status} guardando mensaje (intento ${retryCount}/${maxRetries}), reintentando...`, errorData.error);
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            continue;
          } else {
            // Error del cliente (400, 404) o máximo de reintentos alcanzado
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            console.error(`❌ [ConversationPane] Error guardando mensaje después de todos los reintentos:`, errorData.error || response.statusText);
            // NO bloquear la UI si falla la persistencia
            break;
          }
        }
      } catch (error: any) {
        retryCount++;

        // ✅ CORRECCIÓN: Manejar ECONNRESET específicamente (conexión abortada)
        const isConnectionError = error.message?.includes('aborted') ||
          error.message?.includes('ECONNRESET') ||
          error.code === 'ECONNRESET';

        if (retryCount < maxRetries) {
          if (isConnectionError) {
            console.warn(`⚠️ [ConversationPane] Conexión abortada (ECONNRESET) al guardar mensaje (intento ${retryCount}/${maxRetries}), reintentando con delay...`);
            // Delay más largo para errores de conexión
            await new Promise(resolve => setTimeout(resolve, 3000 * retryCount));
          } else {
            console.warn(`⚠️ [ConversationPane] Error guardando mensaje (intento ${retryCount}/${maxRetries}):`, error.message);
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
          }
          continue;
        } else {
          console.error('❌ [ConversationPane] Error guardando mensaje a BD después de todos los reintentos:', error);
          // NO bloquear la UI si falla la persistencia
          break;
        }
      }
    }
  }, []);

  const chatTranslations = useTranslations("chat");

  // Chat state - ahora se usa el estado global de Zustand
  // const [messages, setMessages] = useState<ChatMessage[]>([]); // ELIMINADO - usar estado global
  const [value, setValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showApprovalButton, setShowApprovalButton] = useState(false);
  const trimmed = value.trim();

  // Helper state
  const [showHelper, setShowHelper] = useState(false);
  const helperTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const hasMountedRef = useRef(false);
  const [showJumpToNewest, setShowJumpToNewest] = useState(false);
  const pendingRafRef = useRef<number | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  // Helper functions - EXACT COPY FROM TEAM
  function hideHelper() {
    if (helperTimerRef.current) {
      clearTimeout(helperTimerRef.current);
      helperTimerRef.current = null;
    }
    if (showHelper) {
      setShowHelper(false);
    }
  }

  function showEmptyHelper() {
    setShowHelper(true);
    if (helperTimerRef.current) {
      clearTimeout(helperTimerRef.current);
    }
    helperTimerRef.current = setTimeout(() => {
      setShowHelper(false);
      helperTimerRef.current = null;
    }, 2000);
  }

  const isNearBottom = useCallback((el: HTMLElement) => {
    const threshold = 80;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = scrollContainerRef.current;
      if (!container) return;
      // ✅ CORRECCIÓN: Usar scrollTo directamente en el contenedor en lugar de scrollIntoView
      // Esto previene la propagación de scroll hacia ancestros
      container.scrollTo({ 
        top: container.scrollHeight, 
        behavior 
      });
      shouldStickToBottomRef.current = true;
    },
    []
  );

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const nearBottom = isNearBottom(target);
      shouldStickToBottomRef.current = nearBottom;
      if (nearBottom) {
        setShowJumpToNewest(false);
      } else {
        // Show jump to latest if there are new messages while scrolled up
        const hasNewerMessages = lastMessageRef.current && lastMessageRef.current.nextElementSibling !== bottomSentinelRef.current;
        if (hasNewerMessages) {
          setShowJumpToNewest(true);
        }
      }
    },
    [isNearBottom]
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const lastMessage = messages[messages.length - 1];
    const isFromUser = lastMessage?.role === "user";

    if (shouldStickToBottomRef.current || isFromUser) {
      const behavior = hasMountedRef.current ? "smooth" : "auto";
      requestAnimationFrame(() => scrollToBottom(behavior));
      setShowJumpToNewest(false);
      shouldStickToBottomRef.current = true;
    } else {
      setShowJumpToNewest(true);
    }

    hasMountedRef.current = true;
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const handleResize = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      if (shouldStickToBottomRef.current) {
        scrollToBottom("auto");
      } else {
        if (isNearBottom(container)) {
          setShowJumpToNewest(false);
        }
      }
    };

    const container = scrollContainerRef.current;
    if (!container) {
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [isNearBottom, scrollToBottom]);

  // Adjust scroll position when late content (images, dynamic blocks, fonts) changes layout
  useEffect(() => {
    const container = scrollContainerRef.current;
    const contentEl = contentRef.current;
    if (!container || !contentEl) return;

    const scheduleAdjust = () => {
      if (pendingRafRef.current) cancelAnimationFrame(pendingRafRef.current);
      pendingRafRef.current = requestAnimationFrame(() => {
        pendingRafRef.current = null;
        if (shouldStickToBottomRef.current || isNearBottom(container)) {
          scrollToBottom("auto");
          setShowJumpToNewest(false);
        }
      });
    };

    const contentResizeObserver = new ResizeObserver(() => {
      scheduleAdjust();
    });
    contentResizeObserver.observe(contentEl);

    // Track image load/error within messages
    const images = Array.from(contentEl.querySelectorAll("img"));
    const removeImageListeners: Array<() => void> = [];
    images.forEach((img) => {
      const onImgEvent = () => scheduleAdjust();
      if (!img.complete) {
        img.addEventListener("load", onImgEvent, { once: true });
        img.addEventListener("error", onImgEvent, { once: true });
        removeImageListeners.push(() => {
          img.removeEventListener("load", onImgEvent as EventListener);
          img.removeEventListener("error", onImgEvent as EventListener);
        });
      }
    });

    // Font loading events (helps when web fonts swap in)
    let removeFontsListeners: (() => void) | undefined;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts && typeof fonts.addEventListener === "function") {
      const onFontsDone = () => scheduleAdjust();
      fonts.addEventListener("loadingdone", onFontsDone);
      fonts.addEventListener("loadingerror", onFontsDone);
      removeFontsListeners = () => {
        fonts.removeEventListener("loadingdone", onFontsDone);
        fonts.removeEventListener("loadingerror", onFontsDone);
      };
    } else if (fonts && fonts.ready && typeof fonts.ready.then === "function") {
      fonts.ready.then(() => scheduleAdjust());
    }

    return () => {
      contentResizeObserver.disconnect();
      removeImageListeners.forEach((off) => off());
      if (removeFontsListeners) removeFontsListeners();
      if (pendingRafRef.current) {
        cancelAnimationFrame(pendingRafRef.current);
        pendingRafRef.current = null;
      }
    };
  }, [isNearBottom, scrollToBottom, messages]);

  useEffect(() => {
    const node = composerRef.current;
    if (!node) {
      return;
    }
    node.style.height = "auto";
    const maxHeight = 220;
    const nextHeight = Math.min(node.scrollHeight, maxHeight);
    node.style.height = `${nextHeight}px`;
  }, [value]);

  // ✅ FASE 8 & 9: Integración de Referencias PDF en Chat con ID Explícito
  const navigateToAnalysis = useUI((state: UIState) => state.navigateToAnalysis);
  const setSelectedField = useUI((state: UIState) => state.setSelectedField);
  const policyAnalyses = useUI((state: UIState) => state.policyAnalyses);

  const handleViewInPdf = useCallback((fieldName: string, pageNumber: number, analysisId?: string) => {
    console.log('🔍 [ConversationPane] handleViewInPdf:', { fieldName, pageNumber, analysisId });

    let targetAnalysisId: string | undefined = analysisId;

    // Si no viene ID explícito o es 'current', intentar deducir
    if (!targetAnalysisId || targetAnalysisId === 'current') {
      // Priorizamos el análisis seleccionado si existe
      targetAnalysisId = useUI.getState().selectedPolicyAnalysisId || undefined;

      if (!targetAnalysisId && policyAnalyses.length > 0) {
        // Intentar encontrar el análisis que tiene esta referencia
        const matchingAnalysis = policyAnalyses.find(a =>
          a.pageReferences?.some(r => r.fieldName === fieldName && r.pageNumber === pageNumber)
        );

        if (matchingAnalysis) {
          targetAnalysisId = matchingAnalysis.id;
        } else {
          // Fallback al primero
          targetAnalysisId = policyAnalyses[0]?.id || undefined;
        }
      }
    }

    // ✅ NUEVO: Ejecutar navegación
    if (targetAnalysisId) {
      console.log('✅ [ConversationPane] Navegando a:', { targetAnalysisId, fieldName, pageNumber });

      // 1. Establecer análisis seleccionado
      useUI.setState({ selectedPolicyAnalysisId: targetAnalysisId });

      // 2. Cambiar a tab Analysis
      useUI.setState({ activeTab: 'analysis' });

      // 3. Establecer navegación PDF (para PdfViewer)
      useUI.setState({
        pdfNavigationTarget: {
          page: pageNumber,
          fieldName: fieldName || null,
          analysisId: targetAnalysisId
        }
      });

      // 4. Establecer campo seleccionado (para highlighting)
      if (fieldName) {
        setSelectedField(fieldName);
      }
    } else {
      console.warn('⚠️ [ConversationPane] No se pudo determinar targetAnalysisId');
      toast.error("No se pudo localizar el documento original. Intenta recargar la página.");
    }
  }, [setSelectedField, policyAnalyses]);

  const parseMessageContent = useCallback((content: string): React.ReactNode => {
    // Regex para capturar [Ver en PDF](#ref:FIELD:PAGE:ID?)
    // Soporta formato antiguo (#ref:FIELD:PAGE) y nuevo (#ref:FIELD:PAGE:ID)
    const regex = /\[Ver en PDF\]\(#ref:([^:]+):(\d+)(?::([^)]+))?\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Texto antes del match
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      const fieldName = match[1] || '';
      const pageNumber = parseInt(match[2] || '0', 10);
      const analysisId = match[3]; // Puede ser undefined

      if (fieldName && pageNumber > 0) {
        parts.push(
          <Button
            key={`ref-${match.index}`}
            variant="secondary"
            size="sm"
            className="mx-1 h-6 px-2 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 inline-flex items-center"
            onClick={() => handleViewInPdf(fieldName, pageNumber, analysisId)}
          >
            <Search className="mr-1 h-3 w-3" />
            Ver en PDF (Pág. {pageNumber})
          </Button>
        );
      }

      lastIndex = regex.lastIndex;
    }

    // Texto restante
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : content;
  }, [handleViewInPdf]);

  const sendMessage = useCallback(async (messageText?: string) => {
    const trimmed = messageText ? messageText.trim() : value.trim();
    if (!trimmed) return;
    
    // ✅ CORRECCIÓN UX: Limpiar input INMEDIATAMENTE para feedback instantáneo
    // Esto debe ocurrir ANTES de cualquier operación async
    if (!messageText) setValue("");
    
    const container = scrollContainerRef.current;
    const nearBottom = container ? isNearBottom(container) : true;
    shouldStickToBottomRef.current = nearBottom;

    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: Date.now()
    };
    
    // Añadir mensaje al chat (visual)
    addMessage(newUserMessage);

    // ✅ CORRECCIÓN UX: Indicadores de carga INMEDIATAMENTE después de añadir mensaje
    setIsTyping(true);
    setIsAnalyzing(true);
    
    // ✅ FASE 2.2: Guardar mensaje del usuario en BD (fire-and-forget, no bloquea UI)
    // La persistencia ocurre en paralelo sin bloquear el flujo principal
    saveMessageToDB(newUserMessage).catch(err => {
      console.warn('⚠️ [ConversationPane] Error guardando mensaje (no bloqueante):', err.message);
    });

    try {
      const currentCaseId = useUI.getState().currentCaseId;

      const response = await fetch('/api/chat/process-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          brief: brief,
          caseId: currentCaseId  // ← AÑADIDO: Enviar caseId activo
        })
      });

      if (!response.ok) {
        // Manejo de error de API
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const result = await response.json();

      // ✅ Pasar contenido como string - MarkdownContent se encarga del renderizado enriquecido
      const assistantResponse: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.response, // String - se renderiza con Markdown en Message.tsx
        createdAt: Date.now(),
        agent: { label: chatTranslations("agents.sourcing") },
      };
      addMessage(assistantResponse);

      // ✅ FASE 2.2: Guardar respuesta del agente en BD
      await saveMessageToDB(assistantResponse);
    } catch (error: any) {
      console.error("Error sending message or processing response:", error);
      // Mostrar mensaje de error al usuario en el chat
      const errorResponse: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Disculpa, hubo un problema procesando tu mensaje. ¿Puedes intentar de nuevo?",
        createdAt: Date.now(),
        agent: { label: chatTranslations("agents.sourcing") },
      };
      addMessage(errorResponse);
    } finally {
      setIsAnalyzing(false); // Detener indicador de análisis
      setIsTyping(false);
    }
  }, [brief, chatTranslations, isNearBottom, value, saveMessageToDB, parseMessageContent]);

  // ✅ CORRECCIÓN: Cargar initialMessage desde localStorage si existe (fallback para recargas directas)
  // Con router.push() normalmente no es necesario, pero sirve como fallback si alguien recarga la página
  useEffect(() => {
    if (!initialMessage || initialMessage.trim() === '') {
      if (typeof window !== 'undefined') {
        const pendingMessage = localStorage.getItem('pendingInitialMessage');
        const messageSource = localStorage.getItem('initialMessageSource');
        if (pendingMessage && messageSource === 'form') {
          console.log('📥 [ConversationPane] Cargando initialMessage desde localStorage (fallback):', pendingMessage);
          setInitialMessage(pendingMessage);
          // Limpiar localStorage después de cargar
          localStorage.removeItem('pendingInitialMessage');
          localStorage.removeItem('initialMessageSource');
        }
      }
    }
  }, []); // Solo ejecutar una vez al montar

  // ✅ FASE REESTRUCTURACIÓN v2: Limpiar initialMessage sin procesar
  // El mensaje de bienvenida ahora se genera en approveCurrentCase() y se guarda en BD
  // ConversationPane NO debe disparar OpenAI automáticamente - solo limpiar el estado
  useEffect(() => {
    if (initialMessage && initialMessage.trim() !== '') {
      // ✅ Si ya hay mensajes en la UI, significa que approveCurrentCase ya procesó
      // Solo limpiar initialMessage para evitar reprocesamiento
      if (messages.length > 0) {
        console.log('⏭️ [ConversationPane] Ya hay mensajes en UI, limpiando initialMessage sin procesar');
        clearInitialMessage();
        return;
      }
      
      // ✅ CASO ESPECIAL: Si NO hay mensajes pero SÍ hay initialMessage
      // Esto solo debería ocurrir en recargas de página donde los mensajes
      // aún no se han cargado desde BD. NO procesar aquí - esperar carga de BD.
      console.log('⏳ [ConversationPane] initialMessage presente pero sin mensajes - esperando carga de BD');
      
      // Limpiar de todas formas para evitar loops
      clearInitialMessage();
    }
  }, [initialMessage, messages.length, clearInitialMessage]);

  // ✅ FASE 3: Mensaje de bienvenida para placeholder
  useEffect(() => {
    const currentCaseId = useUI.getState().currentCaseId;
    const currentMessages = useUI.getState().messages;

    // Solo para placeholder sin caso y sin mensajes
    if (!currentCaseId && currentMessages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: '¡Hola! Soy tu asistente de seguros. Para darte una respuesta más detallada, por favor llena el formulario que aparece a la derecha.',
        createdAt: Date.now(),
        agent: { label: 'Briki Assistant' }
      };

      addMessage(welcomeMessage);
      console.log('✅ [ConversationPane] Mensaje de bienvenida enviado');
    }
  }, [messages.length, addMessage]);

  // ✅ ELIMINADO: useEffect problemático que causaba bucle infinito
  // Los mensajes históricos se procesan directamente en SidebarChatPanel
  // cuando se carga un caso histórico

  // ✅ CORRECCIÓN CRÍTICA: Mostrar botón SOLO si !caseApproved Y es un caso nuevo (no histórico)
  // Si caseApproved es true, es un caso histórico aprobado - NO mostrar botones de aprobar
  // isBriefValid solo se usa para DESHABILITAR, no para OCULTAR
  useEffect(() => {
    // ✅ CORRECCIÓN CRÍTICA: Solo considerar new-thread-placeholder si EXPLÍCITAMENTE es el valor
    // NO si currentCaseId es null (puede ser temporal durante navegación)
    const isExplicitNewThreadPlaceholder = currentCaseId === 'new-thread-placeholder';

    // ✅ REGLA DE NEGOCIO: Si tenemos un caseId válido (UUID), verificar status en BD
    // antes de decidir si mostrar botones
    const hasValidCaseId = currentCaseId &&
      currentCaseId !== 'new-thread-placeholder' &&
      currentCaseId.length > 10; // UUIDs son más largos

    if (isExplicitNewThreadPlaceholder) {
      // ✅ SOLO en new-thread-placeholder EXPLÍCITO, mostrar botones
      // Esto asegura que los botones aparezcan incluso si caseApproved está en true por error
      setShowApprovalButton(true);

      // ✅ Si estamos en new-thread-placeholder y caseApproved es true, forzar a false
      // Esto corrige cualquier estado persistido incorrecto
      if (caseApproved) {
        console.warn('⚠️ [ConversationPane] caseApproved=true en new-thread-placeholder - FORZANDO a false');
        useUI.getState().setCaseApproved(false);
      }
      console.log('🔍 [ConversationPane] showApprovalButton=true (new-thread-placeholder detectado)');
    } else if (hasValidCaseId) {
      // ✅ Para casos históricos, mostrar botones solo si !caseApproved
      const shouldShow = !caseApproved;
      setShowApprovalButton(shouldShow);
      // console.log('🔍 [ConversationPane] showApprovalButton actualizado:', { caseApproved, shouldShow, currentCaseId });
    } else {
      // ✅ currentCaseId es null (navegando) - NO hacer nada, esperar a que se estabilice
      // console.log('🔍 [ConversationPane] currentCaseId temporal (null), esperando estabilización');
    }
  }, [caseApproved, currentCaseId]);

  // Función optimizada de validación de clientes con cache
  const validateClientWithCache = async (): Promise<string | null> => {
    const { clientName, selectedClientId } = brief;

    // Si ya hay un ID seleccionado, usarlo
    if (selectedClientId) {
      return selectedClientId;
    }

    // Si no hay nombre de cliente, no validar
    if (!clientName || clientName.trim() === '') {
      return null;
    }

    const clientNameKey = clientName.trim().toLowerCase();

    // Verificar cache primero
    if (validatedClientCache.has(clientNameKey)) {
      const cachedClientId = validatedClientCache.get(clientNameKey)!;
      console.log('✅ Usando cliente del cache:', clientNameKey, '->', cachedClientId);
      return cachedClientId;
    }

    // Si no está en cache, validar usando el hook
    try {
      const clientId = await validateAndResolveClient(clientName);

      // Guardar en cache si se obtuvo un ID
      if (clientId) {
        setValidatedClientCache(prev => new Map(prev).set(clientNameKey, clientId));
        console.log('✅ Cliente validado y guardado en cache:', clientNameKey, '->', clientId);
      }

      return clientId;
    } catch (error: any) {
      console.error('Error en validación de cliente:', error);
      throw error;
    }
  };

  // ✅ FASE 7: Función simplificada usando createCaseIfNeeded extendido (elimina código duplicado)
  const handleApprovalOrchestrationAsync = useCallback(async () => {
    // ✅ CORRECCIÓN CRÍTICA: Establecer estados ANTES de esperar para que BriefForm detecte el cambio
    // BriefForm tiene un useEffect que detecta caseApproving/caseResolvingClient y sincroniza formData
    useUI.setState({ caseResolvingClient: true, caseApproving: true }); // ✅ Sincronizar estado global
    console.log('🔒 [ConversationPane] Botones bloqueados para sincronización (caseResolvingClient=true, caseApproving=true)');

    try {
      // ✅ CORRECCIÓN CRÍTICA: Esperar un momento para que BriefForm sincronice formData con brief global
      // BriefForm tiene un useEffect que detecta caseApproving/caseResolvingClient y sincroniza automáticamente
      // Necesitamos dar tiempo para que React ejecute el useEffect de BriefForm
      await new Promise(resolve => setTimeout(resolve, 150)); // ✅ Aumentado a 150ms para asegurar sincronización
      const currentBrief = useUI.getState().brief;
      console.log('📋 [ConversationPane] Brief actual para aprobación:', currentBrief);
      console.log('📝 [ConversationPane] freeText en brief:', currentBrief.freeText);

      // ✅ CORRECCIÓN CRÍTICA: Crear caso SIN navegar primero, luego aprobar, luego navegar
      // createCaseIfNeeded ahora retorna { caseId, clientId } para evitar doble validación
      const result = await createCaseIfNeeded(
        currentBrief, // ✅ CORRECCIÓN: Usar brief actualizado del estado global
        router,
        {
          validateClient: validateAndResolveClient, // ✅ FASE 7: Modal habilitado
          setInitialMessage,
          setCurrentCaseId,
          currentCaseId,
          saveUserMessage: false, // ✅ CORRECCIÓN: NO guardar mensaje aquí, approveCurrentCase lo enviará y guardará
          skipNavigation: true, // ✅ CORRECCIÓN: Omitir navegación para aprobar antes
          locale: locale as 'en' | 'es', // ✅ CORRECCIÓN i18n: Pasar locale para navegación consistente
        }
      );

      // ✅ CORRECCIÓN CRÍTICA: Aprobar el caso ANTES de navegar
      if (result.caseId) {
        // Obtener el currentCaseId actualizado (puede haber cambiado después de createCaseIfNeeded)
        const updatedCurrentCaseId = useUI.getState().currentCaseId;
        const finalCaseId = updatedCurrentCaseId || result.caseId;

        console.log('✅ [ConversationPane] Aprobando caso antes de navegar:', finalCaseId);

        // Paso 1: Asegurar que currentCaseId esté establecido antes de aprobar
        if (finalCaseId !== updatedCurrentCaseId) {
          setCurrentCaseId(finalCaseId);
          // Esperar un momento para que el estado se sincronice
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // ✅ CORRECCIÓN: Usar clientId ya validado por createCaseIfNeeded
        // NO llamar validateClientWithCache() para evitar doble modal
        const clientId = result.clientId;
        console.log('✅ [ConversationPane] Usando clientId ya validado:', clientId);

        // Paso 3: Aprobar el caso con el clientId
        // ✅ CORRECCIÓN: approveCurrentCase ya establece caseApproved: true internamente
        const success = await approveCurrentCase(clientId);

        if (!success) {
          console.log('❌ [ConversationPane] Aprobación falló');
          useUI.setState({ caseApproving: false, caseResolvingClient: false }); // ✅ Sincronizar estado global
          return; // No navegar si la aprobación falla
        }

        // ✅ CORRECCIÓN: Verificar que caseApproved se estableció correctamente
        const currentState = useUI.getState();
        if (!currentState.caseApproved) {
          console.warn('⚠️ [ConversationPane] caseApproved no se estableció, forzando a true');
          useUI.setState({ caseApproved: true });
        }

        console.log('✅ [ConversationPane] Caso aprobado exitosamente, caseApproved=', currentState.caseApproved, 'navegando...');

        // ✅ CORRECCIÓN CRÍTICA: Establecer approvalPhase='completed' Y persistir ANTES de navegar
        // Esto asegura que los botones DESAPAREZCAN permanentemente
        useUI.getState().setCaseApproved(true);
        useUI.getState().setApprovalPhase('completed');
        console.log('✅ [ConversationPane] approvalPhase=completed - botones NUNCA reaparecerán');
        
        // Esperar un momento para que la persistencia se complete
        await new Promise(resolve => setTimeout(resolve, 50));

        // Paso 4: Navegar DESPUÉS de aprobar exitosamente y persistir estado
        // ✅ CORRECCIÓN: Usar useLocale() en lugar de regex para consistencia i18n
        const targetUrl = `/${locale}/agent/${finalCaseId}`;
        console.log(`✅ [ConversationPane] Navegando a: ${targetUrl} (después de aprobar y persistir)`);

        router.push(targetUrl);

        // Resetear otros estados después de navegar (pero NO approvalPhase ni caseApproved)
        useUI.setState({ caseApproving: false, caseResolvingClient: false }); // ✅ Sincronizar estado global
        console.log('✅ [ConversationPane] Estado final: approvalPhase=completed, caseApproving=false, caseResolvingClient=false');
      }
    } catch (error: any) {
      console.error('❌ [ConversationPane] FASE 7: Error en aprobación con validación:', error);

      // ✅ Manejar cancelación de creación de cliente
      if (error.message === 'CLIENT_CREATION_CANCELLED') {
        console.log('ℹ️ [ConversationPane] Usuario canceló creación de cliente');
        // No mostrar error, solo resetear estados
        useUI.setState({ caseApproving: false, caseResolvingClient: false }); // ✅ Sincronizar estado global
        return; // No propagar error si es cancelación
      }

      // ✅ Manejar otros errores
      if (error.message === "CLIENT_CREATION_FAILED") {
        console.error('❌ [ConversationPane] Error al crear el cliente');
        // Aquí podrías mostrar un mensaje de error al usuario
      } else {
        console.error('❌ [ConversationPane] Error inesperado:', error);
      }

      // Resetear estados en caso de error
      useUI.setState({ caseApproving: false, caseResolvingClient: false }); // ✅ Sincronizar estado global
    } finally {
      // ✅ Resetear estados de carga solo si no navegó
      // Si createCaseIfNeeded navegó exitosamente, este código puede no ejecutarse
      useUI.setState({ caseApproving: false, caseResolvingClient: false }); // ✅ Sincronizar estado global
    }
  }, [brief, router, validateAndResolveClient, setInitialMessage, setCurrentCaseId, currentCaseId, validateClientWithCache, approveCurrentCase]);

  // ✅ CORRECCIÓN: Wrapper síncrono para onApprove (que espera () => void, no async)
  const handleApprovalOrchestration = useCallback(() => {
    handleApprovalOrchestrationAsync().catch((error) => {
      console.error('❌ [ConversationPane] Error en handleApprovalOrchestration:', error);
    });
  }, [handleApprovalOrchestrationAsync]);

  // Función pública para validación de clientes (para usar desde otros componentes)
  const validateAndApproveClient = async (): Promise<boolean> => {
    try {
      const clientId = await validateClientWithCache();
      const success = await approveCurrentCase(clientId);
      return success;
    } catch (error: any) {
      console.error('Error en validación y aprobación de cliente:', error);

      if (error.message === "CLIENT_CREATION_CANCELLED") {
        console.log('Usuario canceló la creación del cliente');
        return false;
      } else if (error.message === "CLIENT_CREATION_FAILED") {
        console.error('Error al crear el cliente');
        return false;
      } else {
        console.error('Error inesperado:', error);
        return false;
      }
    }
  };

  // La función validateAndApproveClient está disponible para uso interno
  // No necesitamos registrarla en el store para evitar bucles infinitos

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed) {
      showEmptyHelper();
      return;
    }
    sendMessage();
  }

  return (
    <div className={cn("h-full flex flex-col min-h-0", className)}>
      <div className="relative flex-1 flex flex-col min-h-0">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0"
        >
          <div ref={contentRef} className="space-y-4">
            {/* ✅ CORRECCIÓN: Calcular el índice del primer mensaje del agente una sola vez */}
            {(() => {
              const firstAssistantMessageIndex = messages.findIndex(
                (msg: ChatMessage) => msg.role === 'assistant'
              );
              return messages.map((m: ChatMessage, idx: number) => {
                const isLast = idx === messages.length - 1;
                const prevMessage = messages[idx - 1];
                const nextMessage = messages[idx + 1];
                const isGroupStart = !prevMessage || prevMessage.role !== m.role;
                const isGroupEnd = !nextMessage || nextMessage.role !== m.role;
                const messageTabIndex = isLast ? -1 : undefined;
                const displayTimestamp = new Date().toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                });

                // ✅ CORRECCIÓN: Solo pasar onApprove al primer mensaje del agente y si el caso no está aprobado
                const isFirstAssistantMessage = idx === firstAssistantMessageIndex && m.role === 'assistant';
                const shouldShowApproveButton = isFirstAssistantMessage && !caseApproved;

                return (
                  <div
                    key={m.id ?? idx}
                    className={cn(
                      "flex items-end gap-2",
                      m.role === "user" ? "justify-end" : "justify-start",
                      !isGroupEnd ? "mb-1" : "mb-4"
                    )}
                  >
                    <div className={cn(
                      "w-full max-w-[95%]",
                      m.role === "assistant" && "pr-4"
                    )}>
                      <Message
                        role={m.role}
                        /* Pasar contenido directamente - MarkdownContent se encarga del formato */
                        content={m.content}
                        {...(m.agent && m.agent.label ? {
                          agent: {
                            label: m.agent.label,
                            ...(m.agent.tag ? { tag: m.agent.tag } : {})
                          }
                        } : {})}
                        ref={isLast ? lastMessageRef : undefined}
                        {...(messageTabIndex !== undefined ? { tabIndex: messageTabIndex } : {})}
                        isGroupStart={isGroupStart}
                        isGroupEnd={isGroupEnd}
                        timestamp={displayTimestamp}
                        {...(shouldShowApproveButton ? { onApprove: handleApprovalOrchestration } : {})}
                        onPdfReferenceClick={handleViewInPdf}
                      />
                    </div>
                  </div>
                );
              });
            })()}
            {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="w-full max-w-[95%] pr-4">
                  <Message
                    role="assistant"
                    content={chatTranslations("typing")}
                    {...{
                      agent: { label: chatTranslations("agents.sourcing") },
                    }}
                    isTyping
                  />
                </div>
              </div>
            )}
            <div ref={bottomSentinelRef} aria-hidden className="h-1" />
          </div>
        </div>
        {showJumpToNewest ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="pointer-events-auto h-8 rounded-full bg-background/80 px-4 text-xs shadow-md backdrop-blur-sm hover:bg-background"
              onClick={() => {
                scrollToBottom();
                requestAnimationFrame(() => {
                  lastMessageRef.current?.focus({ preventScroll: true });
                });
                setShowJumpToNewest(false);
              }}
            >
              <ArrowDown className="mr-1.5 h-3.5 w-3.5" />
              {chatTranslations("jumpToNewest")}
            </Button>
          </div>
        ) : null}
      </div>
      <div className="sticky bottom-0 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-t">
        {/* Main composer - EXACT COPY FROM TEAM */}
        <div className="relative">
          <Textarea
            ref={composerRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (showHelper) {
                setShowHelper(false);
              }
            }}
            onKeyDown={onKeyDown}
            placeholder={chatTranslations("placeholder")}
            aria-label={chatTranslations("placeholder")}
            className={cn(
              "w-full pl-4 pr-14 py-3",
              "resize-none",
              "bg-background",
              "border border-input",
              "rounded-lg",
              "text-base text-foreground",
              "focus:outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
              "placeholder:text-muted-foreground",
              "min-h-[90px]"
            )}
            style={{
              overflow: "hidden",
            }}
          />
          <div className="absolute right-3 bottom-3">
            <Button
              type="button"
              size="icon"
              onClick={onSubmit}
              disabled={!trimmed || isTyping}
              className={cn(
                "h-9 w-9 rounded-lg",
                trimmed && !isTyping
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <SendHorizonal className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>

        {/* Mensaje guía para gestión de archivos - Adaptado a modo claro/oscuro */}
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Para cargar pólizas o modificar datos del caso, utiliza el <strong className="text-foreground/80">panel derecho</strong>.
                </span>
        </div>

        {/* Press Enter to send message - SIMPLE VERSION */}
        <div
          className={cn(
            "px-4 pt-1 text-xs text-muted-foreground transition-opacity duration-300",
            showHelper ? "opacity-100" : "opacity-0"
          )}
        >
          {chatTranslations("composer.emptyHelper")}
        </div>

        {/* Indicador de análisis de OpenAI */}
        {isAnalyzing && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {chatTranslations("analysis.analyzingDocs")}
          </div>
        )}

        {/* Botón de aprobación */}
        {/* Botón de aprobación */}
        {/* ✅ CORRECCIÓN: Usar helpers globales unificados */}
        {shouldShowApprovalButtons() && (
          <div className="px-4 py-2">
            <div className="p-4 bg-secondary border rounded-lg text-center">
              <p className="text-sm text-secondary-foreground mb-3">
                {chatTranslations("approval.briefReady")}
              </p>
              <Button
                onClick={handleApprovalOrchestration}
                className="w-full"
                disabled={isTyping || !areApprovalButtonsEnabled() || caseResolvingClient}
              >
                {caseResolvingClient ? chatTranslations("approval.validatingClient") : approvalPhase === 'processing' ? chatTranslations("approval.approving") : chatTranslations("approval.approveAndContinue")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ✅ FASE 7: Modal de validación de cliente */}
      {modalState && (
        <ClientValidationModal
          clientName={modalState.clientName}
          isOpen={modalState.isOpen}
          onClose={() => {
            setModalState(null);
            modalState.onCancel();
          }}
          onConfirm={(clientId) => {
            setModalState(null);
            modalState.onConfirm(clientId);
          }}
        />
      )}
    </div>
  );
};

export default ConversationPane;

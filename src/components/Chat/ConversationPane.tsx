"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { useUI } from "@/lib/ui/state";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendHorizonal, ArrowDown, Search, Code2, Puzzle, Paperclip, Image as ImageIcon, ChevronDown, Loader2 } from "lucide-react";
import Message, { type MessageRole, type MessageAgentMeta } from "@/components/Chat/Message";
import { useTranslations } from "next-intl";
import { ProvenanceChip, type ProvenanceTag } from "@/components/Sourcing/ProvenanceChip";
import { useClientValidation } from "@/hooks/useClientValidation";
import { ChatMessage as BaseChatMessage } from "@/store/useChatStore";
// Removemos el import que no funciona en el browser
// import { processChatMessage } from "@/lib/database";

// Tipo local que extiende ChatMessage para soportar React.ReactNode
type ChatMessage = Omit<BaseChatMessage, 'content'> & {
  content: string | React.ReactNode;
};

const SOURCING_PROVENANCE: ProvenanceTag[] = ["API", "Portal", "PDF"];

const ConversationPane: React.FC<{ className?: string }> = ({ className }) => {
  const brief = useUI((state) => state.brief);
  const isSourcing = useUI((state) => state.isSourcing);
  const startSourcing = useUI((state) => state.startSourcing);
  const initialMessage = useUI((state) => state.initialMessage);
  const clearInitialMessage = useUI((state) => state.clearInitialMessage);
  const setInitialMessage = useUI((state) => state.setInitialMessage);
  const approveCurrentCase = useUI((state) => state.approveCurrentCase);
  const caseApproving = useUI((state) => state.caseApproving);
  const caseApproved = useUI((state) => state.caseApproved);
  const briefingCase = useUI((state) => state.briefingCase);
  
  // ✅ CORRECCIÓN CRÍTICA: Calcular validación reactiva basada en brief
  const isBriefValid = useMemo(() => {
    return !!(brief.insurance_category?.trim());
  }, [brief.insurance_category]);
  // Usar estado global de mensajes
  const messages = useUI((state) => state.messages);
  const addMessage = useUI((state) => state.addMessage);
  const setMessages = useUI((state) => state.setMessages);
  // setValidateAndApproveClient removido para evitar bucles infinitos
  
  // Estado local para manejar la validación de clientes
  const [isResolvingClient, setIsResolvingClient] = useState(false);
  
  // Estado local para indicador de análisis de OpenAI
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Hook para validación de clientes (movido al nivel superior)
  const { validateAndResolveClient } = useClientValidation();
  
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
  
  const sourcingTranslations = useTranslations("sourcing.status");
  const chatTranslations = useTranslations("chat");

  // Chat state - ahora se usa el estado global de Zustand
  // const [messages, setMessages] = useState<ChatMessage[]>([]); // ELIMINADO - usar estado global
  const [value, setValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showApprovalButton, setShowApprovalButton] = useState(false);
  const trimmed = value.trim();
  
  // Agent controls state
  const [selectedAgent, setSelectedAgent] = useState<string>("sourcing");
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const agentMenuRef = useRef<HTMLDivElement>(null);
  const helperTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const prevIsSourcingRef = useRef(isSourcing);
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

  const sourcingStatusCopy = useMemo(() => {
    const rawMicroSteps = sourcingTranslations.raw("microSteps");
    const microSteps = Array.isArray(rawMicroSteps)
      ? rawMicroSteps.filter((step): step is string => typeof step === "string")
      : [];

    return {
      body: sourcingTranslations("body"),
      sourcesLabel: sourcingTranslations("sourcesLabel"),
      microStepsLabel: sourcingTranslations("microStepsLabel"),
      microSteps,
    };
  }, [sourcingTranslations]);

  const isNearBottom = useCallback((el: HTMLElement) => {
    const threshold = 80;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const sentinel = bottomSentinelRef.current;
      if (sentinel && typeof sentinel.scrollIntoView === "function") {
        sentinel.scrollIntoView({ behavior, block: "end" });
      } else {
        container.scrollTo({ top: container.scrollHeight, behavior });
      }
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
    if (isSourcing && !prevIsSourcingRef.current) {
      const currentMessages = messages;
      const hasStatusMessage = currentMessages.some(
        (message) => message.role === "assistant" && message.id === "sourcing-status"
      );

      if (hasStatusMessage) {
        const updatedMessages = currentMessages.map((message) =>
          message.id === "sourcing-status"
            ? {
                ...message,
                content: (
                  <SourcingStatusMessage
                    body={sourcingStatusCopy.body}
                    sources={SOURCING_PROVENANCE}
                    sourcesLabel={sourcingStatusCopy.sourcesLabel}
                    microSteps={sourcingStatusCopy.microSteps}
                    microStepsLabel={sourcingStatusCopy.microStepsLabel}
                  />
                ),
              }
            : message
        );
        setMessages(updatedMessages);
      } else {
        const newStatusMessage: ChatMessage = {
          id: "sourcing-status",
          role: "assistant",
          content: (
            <SourcingStatusMessage
              body={sourcingStatusCopy.body}
              sources={SOURCING_PROVENANCE}
              sourcesLabel={sourcingStatusCopy.sourcesLabel}
              microSteps={sourcingStatusCopy.microSteps}
              microStepsLabel={sourcingStatusCopy.microStepsLabel}
            />
          ),
          createdAt: Date.now(),
          agent: { label: chatTranslations("agents.sourcing") },
        };
        addMessage(newStatusMessage);
      }
    }

    prevIsSourcingRef.current = isSourcing;
  }, [chatTranslations, isSourcing, sourcingStatusCopy, messages, setMessages, addMessage]);

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

  const sendMessage = useCallback(async (messageText?: string) => {
    const trimmed = messageText ? messageText.trim() : value.trim();
    if (!trimmed) return;
    const container = scrollContainerRef.current;
    const nearBottom = container ? isNearBottom(container) : true;
    shouldStickToBottomRef.current = nearBottom;
    
    const newUserMessage: ChatMessage = { 
      id: `user-${Date.now()}`,
      role: "user", 
      content: trimmed,
      createdAt: Date.now()
    };
    addMessage(newUserMessage);
    // ✅ FASE 2.2: Guardar mensaje del usuario en BD
    await saveMessageToDB(newUserMessage);
    
    // Solo limpiar el input si no viene de parámetro
    if (!messageText) setValue("");
    setIsTyping(true);
    setIsAnalyzing(true); // Iniciar indicador de análisis

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
      
      const assistantResponse: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.response,
        createdAt: Date.now(),
        agent: { label: chatTranslations("agents.sourcing") },
      };
      addMessage(assistantResponse);
      // ✅ FASE 2.2: Guardar respuesta del agente en BD
      await saveMessageToDB(assistantResponse);
      
      if (!isSourcing) {
        startSourcing();
      }
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
  }, [brief, chatTranslations, isNearBottom, isSourcing, startSourcing, value, saveMessageToDB]);

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

  // ✅ CORRECCIÓN INTEGRAL: Procesar mensaje inicial - GENERAR RESPUESTA REAL DEL AGENTE
  // Recicla la lógica de LandingPage: cuando viene del formulario, llamar a process-message
  // IMPORTANTE: Este useEffect debe estar después de la declaración de sendMessage
  // ✅ CORRECCIÓN CRÍTICA: Esperar a que currentCaseId esté disponible antes de procesar
  const currentCaseId = useUI((state) => state.currentCaseId);
  
  useEffect(() => {
    if (initialMessage && initialMessage.trim() !== '' && sendMessage) {
      const isFromForm = initialMessage.includes('He completado el formulario');
      
      // ✅ CORRECCIÓN CRÍTICA: Si viene del formulario, NECESITA currentCaseId para procesar
      // (sendMessage requiere currentCaseId para llamar a /api/chat/process-message)
      if (isFromForm) {
        // ✅ ESPERAR a que currentCaseId esté disponible (después de recarga)
        if (!currentCaseId) {
          console.log('⏳ [ConversationPane] Esperando currentCaseId antes de procesar mensaje del formulario...');
          // Re-intentar en el siguiente render cuando currentCaseId esté disponible
          return;
        }
        
        console.log('🤖 [ConversationPane] Procesando mensaje del formulario con OpenAI (currentCaseId:', currentCaseId, ')...');
        
        // Usar sendMessage para generar respuesta real del agente
        // sendMessage ya maneja todo: guardar mensaje, llamar a process-message, mostrar respuesta
        sendMessage(initialMessage);
        
        clearInitialMessage();
        return;
      }
      
      // Si viene de LandingPage (mensaje de texto simple), mostrar respuesta estática
      // No requiere currentCaseId porque no llama a sendMessage
      const userMessage: ChatMessage = { 
        role: "user", 
        content: initialMessage, 
        id: `initial-user-${Date.now()}`,
        createdAt: Date.now()
      };
      const agentResponse: ChatMessage = {
        role: "assistant",
        content: "Estoy analizando tu solicitud, pero para darte la mejor recomendación, por favor completa los detalles (Que tengas a disposicion) del caso en el formulario del panel derecho.",
        agent: { label: "Sourcing" },
        id: `initial-agent-${Date.now()}`,
        createdAt: Date.now()
      };
      setMessages([userMessage, agentResponse]);
      
      // ✅ FASE 2.3: Persistir mensajes iniciales en BD (solo si hay currentCaseId)
      if (currentCaseId) {
        saveMessageToDB(userMessage);
        saveMessageToDB(agentResponse);
      }
      
      clearInitialMessage();
    }
  }, [initialMessage, currentCaseId, clearInitialMessage, setMessages, saveMessageToDB, sendMessage]);

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

  // Efecto para mostrar el botón de aprobación
  useEffect(() => {
    // ✅ CORRECCIÓN CRÍTICA: Usar valor reactivo calculado
    setShowApprovalButton(isBriefValid);
  }, [isBriefValid]); // ✅ Dependencia del valor reactivo

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

  // Función de orquestación que maneja la validación y creación de clientes
  const handleApprovalOrchestration = async () => {
    setIsResolvingClient(true);
    try {
      // PASO 0: Verificar y crear el caso SI no existe
      const currentCaseId = useUI.getState().currentCaseId;
      if (!currentCaseId) {
        console.log('📝 No hay currentCaseId, creando caso...');
        
        // Obtener información del usuario
        const authResponse = await fetch('/api/auth/me');
        if (!authResponse.ok) {
          throw new Error('No se pudo obtener información del usuario');
        }
        const { orgId, userId } = await authResponse.json();
        console.log('👤 Usuario autenticado:', { orgId, userId });
        
        // Crear el caso con tempUploads si existen
        const tempUploads = (brief as any).tempUploads || [];
        console.log('📎 [ConversationPane] Creating case with tempUploads:', tempUploads);
        
        const response = await fetch('/api/cases/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orgId,
            userId,
            clientName: brief.clientName,
            businessType: brief.businessType,
            employees: brief.employees,
            status: 'draft',
            stage: 'initial',
            priority: 'medium',
            briefData: {
              freeText: brief.freeText,
              businessType: brief.businessType,
              employees: brief.employees,
              coverage: brief.coverage,
            },
            insurance_category: brief.insurance_category,
            max_budget: brief.max_budget,
            budget_currency: brief.budget_currency,
            required_coverages: brief.required_coverages,
            client_profile: brief.client_profile,
            tempUploads: tempUploads, // ✅ Incluir PDFs
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al crear el caso');
        }
        
        const result = await response.json();
        console.log('✅ Caso creado exitosamente:', result.caseId);
        
        // Establecer currentCaseId inmediatamente después de crear el caso
        useUI.getState().setCurrentCaseId(result.caseId);
        console.log('💾 currentCaseId establecido en:', result.caseId);
        
        // ✅ NUEVO: Marcar timestamp para HomeClient
        (window as any).lastCaseCreation = Date.now();
        
        // ✅ NUEVO: Navegar al caso creado inmediatamente
        const currentPath = window.location.pathname;
        const localeMatch = currentPath.match(/\/(es|en)\//);
        const locale = localeMatch ? localeMatch[1] : 'es';
        
        const targetUrl = `/${locale}/agent/${result.caseId}`;
        console.log(`✅ [ConversationPane] Navigating to: ${targetUrl}`);
        
        // Usar window.location para navegar (más confiable en async)
        window.location.href = targetUrl;
        
        // Salir aquí, el useEffect de HomeClient manejará el resto
        return;
      } else {
        console.log('✅ Ya existe currentCaseId:', currentCaseId);
      }

      // Paso 1: Validar y resolver cliente (con cache)
      const clientId = await validateClientWithCache();
      console.log('✅ Cliente validado/resuelto:', clientId);
      
      // Paso 2: Si la validación es exitosa, aprobar el caso con el clientId
      const success = await approveCurrentCase(clientId);
      
      if (!success) {
        // El error ya se maneja en approveCurrentCase
        return;
      }
      
      // El envío automático del mensaje se maneja en approveCurrentCase
      
    } catch (error: any) {
      console.error('Error en orquestación de aprobación:', error);
      
      // Manejar errores específicos del hook de validación
      if (error.message === "CLIENT_CREATION_CANCELLED") {
        // Usuario canceló la creación del cliente
        console.log('Usuario canceló la creación del cliente');
        // No hacer nada, el usuario puede intentar de nuevo
      } else if (error.message === "CLIENT_CREATION_FAILED") {
        // Error al crear el cliente
        console.error('Error al crear el cliente');
        // Aquí podrías mostrar un mensaje de error al usuario
      } else {
        // Otros errores
        console.error('Error inesperado:', error);
      }
    } finally {
      setIsResolvingClient(false);
    }
  };

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
    <div className={cn("h-full flex flex-col", className)}>
      <div className="relative flex-1 flex flex-col">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        >
          <div ref={contentRef} className="space-y-4">
            {messages.map((m, idx) => {
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
                      onApprove={handleApprovalOrchestration}
                    />
                  </div>
                </div>
              );
            })}
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

        {/* Controls bar - EXACT COPY FROM TEAM */}
        <div className="flex items-center justify-between gap-2">
          {/* Left controls */}
          <div className="flex items-center gap-1">
            {/* Agent selector */}
            <div className="relative" ref={agentMenuRef}>
              <button
                type="button"
                onClick={() => setShowAgentMenu(!showAgentMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted transition-colors text-sm text-foreground"
              >
                {selectedAgent === "sourcing" && <Search className="w-4 h-4 text-primary" />}
                {selectedAgent === "analysis" && <Code2 className="w-4 h-4 text-primary" />}
                {selectedAgent === "creative" && <Puzzle className="w-4 h-4 text-primary" />}
                <span className="font-medium capitalize">
                  {selectedAgent}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {/* Agent dropdown menu */}
              {showAgentMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                  <div className="py-1">
                    {[
                      { id: "sourcing", label: "Sourcing", icon: Search },
                      { id: "analysis", label: "Analysis", icon: Code2 },
                      { id: "creative", label: "Creative", icon: Puzzle }
                    ].map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => {
                          setSelectedAgent(agent.id);
                          setShowAgentMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <agent.icon className="w-4 h-4" />
                        {agent.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* File attachment button */}
            <button
              type="button"
              className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Image button */}
            <button
              type="button"
              className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Add image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>
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
            Analizando documentos con IA, por favor espera...
          </div>
        )}

        {/* Botón de aprobación */}
        {!caseApproved && showApprovalButton && (
          <div className="px-4 py-2">
            <div className="p-4 bg-secondary border rounded-lg text-center">
              <p className="text-sm text-secondary-foreground mb-3">
                El brief del caso está listo. ¿Deseas que proceda con el análisis?
              </p>
              <Button onClick={handleApprovalOrchestration} className="w-full" disabled={isTyping || caseApproving || isResolvingClient}>
                {isResolvingClient ? 'Validando cliente...' : caseApproving ? 'Aprobando...' : 'Aprobar y Continuar Análisis'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationPane;

interface SourcingStatusMessageProps {
  body: string;
  sources: ProvenanceTag[];
  sourcesLabel: string;
  microSteps?: string[];
  microStepsLabel?: string;
}

function SourcingStatusMessage({
  body,
  sources,
  sourcesLabel,
  microSteps,
  microStepsLabel,
}: SourcingStatusMessageProps) {
  const sourcesTitleId = useId();
  const microStepsTitleId = useId();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-foreground/90">{body}</p>

      <div>
        <span id={sourcesTitleId} className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
          {sourcesLabel}
        </span>
        <div
          className="mt-2 flex flex-wrap gap-2"
          role="list"
          aria-labelledby={sourcesTitleId}
        >
          {sources.map((source) => (
            <ProvenanceChip
              key={source}
              provenance={source}
              role="listitem"
              tabIndex={0}
              ariaLabel={`${source} ${sourcesLabel.toLowerCase()}`}
            />
          ))}
        </div>
      </div>

      {microSteps && microSteps.length > 0 ? (
        <div>
          <span id={microStepsTitleId} className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
            {microStepsLabel}
          </span>
          <ol
            className="mt-2 space-y-1 text-xs text-muted-foreground"
            aria-labelledby={microStepsTitleId}
          >
            {microSteps.map((step, index) => (
              <li key={`${step}-${index}`} className="flex items-start gap-2">
                <span className="mt-[6px] inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground/60" aria-hidden />
                <span className="flex-1 leading-relaxed text-foreground/80">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}


"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUI } from "@/lib/ui/state";
import { ArrowLeft, Search, Plus, MoreVertical, Pencil, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { Case } from "@/lib/types";

interface SidebarChatPanelProps {
  cases: Case[];
}

export default function SidebarChatPanel({ cases }: SidebarChatPanelProps) {
  const { closeChatPanel } = useUI();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Search state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Context menu & editing state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const conversationItemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  
  // ✅ FUSIÓN CRÍTICA: Usar Cases en lugar de useChatStore
  const [conversationFilter, setConversationFilter] = useState<"all" | "archived">("all");
  
  // ✅ FUSIÓN CRÍTICA: Transformar Cases a formato de conversaciones
  const displayConversations = useMemo(() => {
    return cases.map((caseItem) => {
      // Extraer título del brief o usar un fallback
      const title = caseItem.brief?.freeText 
        ? caseItem.brief.freeText.substring(0, 50) + (caseItem.brief.freeText.length > 50 ? '...' : '')
        : `Case ${caseItem.id}`;
      
      // Usar clientName si está disponible, sino usar un fallback
      const lastMessage = caseItem.clientName || "No client info";
      
      return {
        id: caseItem.id,
        title,
        lastMessage,
        timestamp: new Date(caseItem.createdAt || Date.now()),
        archived: false, // Los Cases no tienen estado de archivado por ahora
      };
    });
  }, [cases]);
  
  // Filter conversations based on conversation filter
  const visibleConversations = useMemo(() => {
    if (conversationFilter === "archived") {
      return displayConversations.filter((c) => c.archived);
    }
    // "all" shows non-archived conversations
    return displayConversations.filter((c) => !c.archived);
  }, [displayConversations, conversationFilter]);

  // Filter conversations based on debounced search
  const filteredConversations = debouncedSearch.trim()
    ? visibleConversations.filter((conv) => {
        const query = debouncedSearch.toLowerCase();
        return (
          conv.title.toLowerCase().includes(query) ||
          conv.lastMessage.toLowerCase().includes(query)
        );
      })
    : visibleConversations;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    // Focus search input on mount
    searchInputRef.current?.focus();

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeChatPanel();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeChatPanel]);

  const handleNewChat = () => {
    // ✅ CORRECCIÓN: Limpiar estado y navegar a placeholder
    const { setCurrentCaseId, setMessages, setBrief, setInitialMessage, closeChatPanel } = useUI.getState();
    
    // Limpiar estado global
    setCurrentCaseId(null);
    setMessages([]);
    // ✅ FASE 3: Limpieza explícita y completa del estado
    // TODOS los campos deben establecerse explícitamente, incluyendo null para employees y max_budget
    setBrief({
      freeText: '',
      clientName: '',
      selectedClientId: null,
      insurance_category: '',
      max_budget: null,         // ✅ FASE 3: Explícitamente null (no undefined)
      budget_currency: 'COP',
      required_coverages: [],
      client_profile: '',
      businessType: '',
      employees: null,          // ✅ FASE 3: Explícitamente null (no undefined)
      coverage: '',
      tempUploads: []
    });
    setInitialMessage('');
    
    closeChatPanel();
    
    // Navegar a placeholder para nuevo chat
    const currentPath = window.location.pathname;
    const localeMatch = currentPath.match(/\/(es|en)\//);
    const locale = localeMatch ? localeMatch[1] : 'es';
    router.push(`/${locale}/agent/new-thread-placeholder`);
  };

  const handleChatClick = async (caseId: string) => {
    try {
      // ✅ CORRECCIÓN CRÍTICA: Cargar contexto completo del caso
      const { setCurrentCaseId, setBrief, setMessages, setStep, closeChatPanel } = useUI.getState();
      
      console.log(`🔄 [SidebarChatPanel] Loading historical case: ${caseId}`);

      // ✅ OPTIMIZACIÓN: Mostrar indicador de carga
      const loadingToast = document.createElement('div');
      loadingToast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
      loadingToast.textContent = 'Cargando caso histórico...';
      document.body.appendChild(loadingToast);

      try {
        // --- PASO 1 & 2: Fetch Case Data and Messages IN PARALLEL ---
        const [caseResponse, messagesResponse] = await Promise.all([
          fetch(`/api/cases/${caseId}`),
          fetch(`/api/cases/${caseId}/messages`)
        ]);

        // --- PASO 3A: Procesar Respuesta del Caso ---
        if (!caseResponse.ok) {
          const errorData = await caseResponse.json();
          throw new Error(`Failed to fetch case data: ${errorData.error || caseResponse.statusText}`);
        }
        const { case: caseData } = await caseResponse.json();
        if (!caseData || !caseData.briefData) {
          throw new Error('Incomplete case data received.');
        }

        // --- PASO 3B: Procesar Respuesta de Mensajes ---
        let historicalMessages: any[] = []; // Default a vacío
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          historicalMessages = messagesData.messages || [];
          console.log(`✅ [SidebarChatPanel] Loaded ${historicalMessages.length} historical messages for case ${caseId}`);
        } else {
          // No lanzar error si fallan los mensajes, pero loguear
          console.warn(`⚠️ [SidebarChatPanel] Could not load historical messages for case ${caseId}. Status: ${messagesResponse.status}`);
        }

        // --- PASO 4: Actualizar Estado Global ---
        setCurrentCaseId(caseId);
        
        // ✅ CORRECCIÓN: Limpiar tempUploads al cargar caso histórico (PDFs vienen de artifacts, no de tempUploads)
        const briefData = caseData.briefData || {};
        if ((briefData as any).tempUploads) {
          delete (briefData as any).tempUploads;
        }
        setBrief(briefData); // Cargar brief histórico (sin tempUploads)
        
        setMessages(historicalMessages); // <-- CARGAR MENSAJES HISTÓRICOS
        setStep("conversation");
        closeChatPanel();
        console.log(`✅ [SidebarChatPanel] Zustand updated for case ${caseId} (tempUploads limpiados)`);

        // --- PASO 5: Navegar al Agente ---
        const currentPath = window.location.pathname;
        const localeMatch = currentPath.match(/\/(es|en)\//);
        const locale = localeMatch ? localeMatch[1] : 'es';
        const targetUrl = `/${locale}/agent/${caseId}`;
        console.log(`✅ [SidebarChatPanel] Navigating to: ${targetUrl}`);
        router.push(targetUrl); // Usar router.push para navegación SPA

      } finally {
        // ✅ OPTIMIZACIÓN: Remover indicador de carga
        document.body.removeChild(loadingToast);
      }

    } catch (error: any) {
      console.error(`❌ [SidebarChatPanel] Failed to load case ${caseId}:`, error);
      alert(`Error al cargar el caso histórico: ${error.message}`); // Feedback al usuario
    }
  };

  const handleRenameStart = (caseId: string, currentTitle: string) => {
    setRenamingId(caseId);
    setRenameValue(currentTitle);
    setOpenMenuId(null);
  };

  const handleRenameSubmit = (caseId: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      // ✅ FUSIÓN CRÍTICA: TODO - Implementar API para renombrar Case
      console.log('Rename case:', caseId, 'to:', trimmed);
    }
    setRenamingId(null);
    setRenameValue("");
    // Restore focus to the conversation item
    setTimeout(() => {
      conversationItemRefs.current.get(caseId)?.focus();
    }, 0);
  };

  const handleRenameCancel = () => {
    const focusId = renamingId;
    setRenamingId(null);
    setRenameValue("");
    // Restore focus to the conversation item
    if (focusId) {
      setTimeout(() => {
        conversationItemRefs.current.get(focusId)?.focus();
      }, 0);
    }
  };

  const handleDeleteStart = (caseId: string) => {
    setDeleteConfirmId(caseId);
    setOpenMenuId(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return;
    // ✅ FUSIÓN CRÍTICA: TODO - Implementar API para eliminar Case
    console.log('Delete case:', deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const handleDeleteCancel = () => {
    const focusId = deleteConfirmId;
    setDeleteConfirmId(null);
    // Restore focus to the conversation item
    if (focusId) {
      setTimeout(() => {
        conversationItemRefs.current.get(focusId)?.focus();
      }, 0);
    }
  };

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Chats</h2>
        <button
          onClick={closeChatPanel}
          className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          aria-label="Back to navigation"
        >
          <ArrowLeft className="h-4 w-4 text-sidebar-foreground/70" />
        </button>
      </div>

      {/* Search Input */}
      <div className="px-2 py-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-sidebar-accent/50 border border-sidebar-border rounded-md focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:bg-sidebar-accent transition-colors placeholder:text-sidebar-foreground/40"
          />
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="px-2 pb-3">
        <div className="flex items-center gap-1 p-1 bg-sidebar-accent/50 border border-sidebar-border rounded-md">
          <button
            onClick={() => setConversationFilter("all")}
            className={cn(
              "flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              conversationFilter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            All
          </button>
          <button
            onClick={() => setConversationFilter("archived")}
            className={cn(
              "flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              conversationFilter === "archived"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            Archived
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-2 pb-3">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          <span>New chat</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin scrollbar-thumb-sidebar-border scrollbar-track-transparent">
        <div className="space-y-1">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "relative group rounded-md transition-colors",
                "border border-transparent hover:border-sidebar-border hover:bg-sidebar-accent"
              )}
            >
              {renamingId === conversation.id ? (
                // Rename input mode
                <div className="px-3 py-2.5">
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleRenameSubmit(conversation.id);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        handleRenameCancel();
                      }
                    }}
                    onBlur={() => handleRenameSubmit(conversation.id)}
                    className="w-full px-2 py-1 text-sm bg-background border border-sidebar-border rounded focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
                  />
                </div>
              ) : (
                // Normal display mode
                <>
                  <button
                    ref={(el) => {
                      if (el) {
                        conversationItemRefs.current.set(conversation.id, el);
                      } else {
                        conversationItemRefs.current.delete(conversation.id);
                      }
                    }}
                    onClick={() => handleChatClick(conversation.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Delete" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        handleDeleteStart(conversation.id);
                      }
                    }}
                    className="w-full text-left px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-md"
                    aria-label={`${conversation.title}, ${conversation.archived ? "archived, " : ""}last message: ${conversation.lastMessage}, ${conversation.timestamp.toLocaleDateString()}`}
                  >
                    <div className="flex flex-col gap-1 pr-6">
                      <div className="text-sm truncate font-medium text-foreground">
                        {conversation.title}
                      </div>
                      <div className="text-xs text-sidebar-foreground/60 truncate">
                        {conversation.lastMessage}
                      </div>
                      <div className="text-xs text-sidebar-foreground/40 mt-0.5">
                        {conversation.timestamp.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: conversation.timestamp.getFullYear() !== new Date().getFullYear() 
                            ? "numeric" 
                            : undefined,
                        })}
                      </div>
                    </div>
                  </button>

                  {/* Context menu button */}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === conversation.id ? null : conversation.id);
                      }}
                      className={cn(
                        "p-1 rounded hover:bg-sidebar-accent/80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                        openMenuId === conversation.id
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      )}
                      aria-label="More options"
                    >
                      <MoreVertical className="h-4 w-4 text-sidebar-foreground/70" />
                    </button>

                    {/* Dropdown menu */}
                    {openMenuId === conversation.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-0 top-8 z-20 w-40 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameStart(conversation.id, conversation.title);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                            <span>Rename</span>
                          </button>
                          {/* ✅ FUSIÓN CRÍTICA: Archive/Unarchive no implementado para Cases por ahora */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implementar archivar Case
                              console.log('Archive case:', conversation.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
                          >
                            <Archive className="h-4 w-4" />
                            <span>Archive</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStart(conversation.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleDeleteCancel}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-sm bg-popover border border-border rounded-lg shadow-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Delete conversation?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              This action cannot be undone. All messages in this conversation will be permanently deleted.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

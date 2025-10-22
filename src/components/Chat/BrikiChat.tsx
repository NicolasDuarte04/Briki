"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
// Removed useChatStore - using our existing logic
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    FileUp,
    MonitorIcon,
    ArrowUpIcon,
    Paperclip,
    FileText,
    X,
    ImageIcon,
    ArrowDown,
    SendHorizonal,
    ChevronDown,
    Sparkles,
    Image as ImageLucide,
    Code2,
    Search,
    Puzzle,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useUI } from "@/lib/ui/state";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/components/AuthProvider";
import { useTranslations } from "next-intl";
import Message, { type MessageRole, type MessageAgentMeta } from "@/components/Chat/Message";
import { useRouter } from "next/navigation";

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            // Temporarily shrink to get the right scrollHeight
            textarea.style.height = `${minHeight}px`;

            // Calculate new height
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        // Set initial height
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    // Adjust height on window resize
    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

type ChatViewMessage = {
    id?: string;
    role: MessageRole;
    content: string;
    agent?: MessageAgentMeta;
    isSeeded?: boolean;
};

interface BrikiChatProps {
    mode: "landing" | "agent";
    className?: string;
}

export function BrikiChat({ mode, className }: BrikiChatProps) {
    const [value, setValue] = useState("");
    const { user } = useAuth();
    const { setStep, setBrief, brief, isSourcing, startSourcing, initialMessage, clearInitialMessage, setInitialMessage } = useUI();
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 90,
        maxHeight: 200,
    });
    const {
        activeConversationId,
        conversations,
        messagesById,
        createConversation,
        setActiveConversation,
        appendMessage,
    } = useChatStore();
    const router = useRouter();
    
    // Chat translations
    const chatTranslations = useTranslations("chat");
    
    // ✅ FUSIÓN CRÍTICA: Estado de múltiples PDFs (del LandingChatInput original)
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [tempUploads, setTempUploads] = useState<Array<{
        name: string;
        size: number;
        text: string;
        pages: number;
        storagePath: string;
        // ✅ CORRECCIÓN: Propiedades adicionales para la API
        fileName: string;
        fileSize: number;
        pageCount: number;
        charactersExtracted: number;
        fileHash: string;
        extractedText: string;
    }>>([]);

    // Agent mode state (messages come from global store)
    const [isTyping, setIsTyping] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const lastMessageRef = useRef<HTMLDivElement | null>(null);
    const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
    const shouldStickToBottomRef = useRef(true);
    const hasMountedRef = useRef(false);
    const [showJumpToNewest, setShowJumpToNewest] = useState(false);
    const pendingRafRef = useRef<number | null>(null);
    
    // Agent mode controls
    const [selectedAgent, setSelectedAgent] = useState<string>("sourcing");
    const [showAgentMenu, setShowAgentMenu] = useState(false);
    const agentMenuRef = useRef<HTMLDivElement>(null);
    const agentFileInputRef = useRef<HTMLInputElement>(null);
    const [attachedFiles, setAttachedFiles] = useState<Array<{
        name: string;
        type: string;
        size: number;
        preview?: string;
    }>>([]);

    // ✅ FUSIÓN CRÍTICA: PDF upload handlers (del LandingChatInput original)
    const handleUploadClick = () => {
        console.log('📁 Frontend: Abriendo selector de archivos...');
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        console.log('📄 Frontend: Archivo seleccionado:', file.name, file.type, file.size);
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('pdf', file);
            console.log('📡 Frontend: FormData creado');

            console.log('🚀 Frontend: Enviando a /api/upload/pdf...');
            const response = await fetch('/api/upload/pdf', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            console.log('📡 Frontend: Respuesta recibida:', result);

            if (result.success) {
                // ✅ FUSIÓN CRÍTICA: Agregar a tempUploads array (múltiples PDFs)
                const newUpload = {
                    name: result.metadata.name,
                    size: result.metadata.size,
                    text: result.text,
                    pages: result.metadata.pages,
                    storagePath: result.storagePath || `temp/${Date.now()}_${result.metadata.name}`,
                    // ✅ CORRECCIÓN: Añadir propiedades que espera la API
                    fileName: result.metadata.name,
                    fileSize: result.metadata.size,
                    pageCount: result.metadata.pages,
                    charactersExtracted: result.text.length,
                    fileHash: result.metadata.fileHash || '',
                    extractedText: result.text
                };
                
                setTempUploads(prev => [...prev, newUpload]);
                
                console.log('📖 Texto extraído:', result.text.substring(0, 200) + '...');
                console.log('✅ Archivo agregado a tempUploads:', newUpload);
            } else {
                alert(`❌ Error: ${result.error}`);
            }
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión');
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    const handleRemoveFile = (storagePath: string) => {
        setTempUploads(prev => prev.filter(upload => upload.storagePath !== storagePath));
    };

    // Agent mode file handlers
    const handleAgentFileClick = () => {
        agentFileInputRef.current?.click();
    };

    const handleAgentFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const newFiles = Array.from(files).map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
        }));

        setAttachedFiles(prev => [...prev, ...newFiles]);
        event.target.value = '';
    };

    const handleRemoveAttachedFile = (index: number) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Close agent menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (agentMenuRef.current && !agentMenuRef.current.contains(event.target as Node)) {
                setShowAgentMenu(false);
            }
        };

        if (showAgentMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showAgentMenu]);

    // Auto-scroll utilities for agent mode
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
                const hasNewerMessages = lastMessageRef.current && lastMessageRef.current.nextElementSibling !== bottomSentinelRef.current;
                if (hasNewerMessages) {
                    setShowJumpToNewest(true);
                }
            }
        },
        [isNearBottom]
    );

    // Ensure there is an active conversation in agent mode and focus composer
    // Note: Conversation creation is now handled by HomeClient for URL sync
    useEffect(() => {
        if (mode !== "agent") return;
        // Just focus the textarea when in agent mode
        const timer = setTimeout(() => {
            textareaRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
    }, [mode]);

    // Select messages for current conversation
    const messages: ChatViewMessage[] = useMemo(() => {
        const id = activeConversationId ?? conversations[0]?.id;
        if (!id) return [];
        return (messagesById[id] ?? []) as unknown as ChatViewMessage[];
    }, [activeConversationId, conversations, messagesById]);

    // Send message handler for agent mode
    const sendMessage = useCallback(async (messageText?: string) => {
        const trimmed = messageText ? messageText.trim() : value.trim();
        if (!trimmed) return;
        const container = scrollContainerRef.current;
        const nearBottom = container ? isNearBottom(container) : true;
        shouldStickToBottomRef.current = nearBottom;

        // Ensure a conversation exists
        let conversationId = activeConversationId ?? conversations[0]?.id;
        if (!conversationId) {
            // This should rarely happen as HomeClient creates a conversation
            console.warn('No active conversation in sendMessage, creating one');
            conversationId = createConversation();
            setActiveConversation(conversationId);
            // Navigate to conversation step (our existing logic)
            setStep("conversation");
        }

        appendMessage(conversationId, { role: "user", content: trimmed });
        if (!messageText) setValue("");
        setIsTyping(true);

        try {
            const response = await fetch('/api/chat/process-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: trimmed,
                    userId: 'anonymous',
                    conversationId: conversationId,
                    brief: brief
                })
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const result = await response.json();
            
            appendMessage(conversationId, {
                role: "assistant",
                content: result.response,
                agent: { label: chatTranslations("agents.sourcing") },
            });
            setIsTyping(false);
            
            if (!isSourcing) {
                startSourcing();
            }
        } catch (error) {
            console.error('Error processing message:', error);
            appendMessage(conversationId, {
                role: "assistant",
                content: "Disculpa, hubo un problema procesando tu mensaje. ¿Puedes intentar de nuevo?",
                agent: { label: chatTranslations("agents.sourcing") },
            });
            setIsTyping(false);
        }
    }, [activeConversationId, appendMessage, brief, chatTranslations, conversations, createConversation, isNearBottom, isSourcing, router, setActiveConversation, startSourcing, value]);

    // ✅ FUSIÓN CRÍTICA: Landing mode submit handler (del LandingChatInput original)
    const handleLandingSubmit = async () => {
        // Check if user is authenticated
        if (!user) {
            window.location.href = '/login';
            return;
        }
        
        // For authenticated users, go to conversation
        let fullMessage = value.trim();
        if (tempUploads.length > 0) {
            fullMessage += `\n\n📄 DOCUMENTOS PDF ADJUNTOS:\n`;
            tempUploads.forEach((upload, index) => {
                fullMessage += `${index + 1}. ${upload.name} (${upload.pages} páginas)\n`;
            });
        }
        
        if (fullMessage) {
            // ✅ FUSIÓN CRÍTICA: Usar setInitialMessage para pasar el mensaje completo
            setInitialMessage(fullMessage);
            setBrief({ freeText: fullMessage });
        }
        
        // ✅ FUSIÓN CRÍTICA: Llamar a la API con tempUploads
        try {
            const response = await fetch('/api/chat/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: fullMessage,
                    tempUploads: tempUploads
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.caseId) {
                    // Navegar al caso creado
                    router.push(`/cases/${result.caseId}`);
                    return;
                }
            }
        } catch (error) {
            console.error('Error starting chat:', error);
        }
        
        trackEvent("hero_chat_start", { hasText: Boolean(value.trim()), hasPDF: tempUploads.length > 0 });
        setStep("conversation");
    };

    // Handle initial message for agent mode
    useEffect(() => {
        if (mode === "agent" && initialMessage && initialMessage.trim() && initialMessage !== "") {
            sendMessage(initialMessage.trim());
            clearInitialMessage();
        }
    }, [mode, initialMessage, sendMessage, clearInitialMessage]);

    // Auto-scroll effects for agent mode
    useEffect(() => {
        if (mode !== "agent") return;
        
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
    }, [mode, messages, scrollToBottom]);

    useEffect(() => {
        if (mode !== "agent") return;
        
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
    }, [mode, isNearBottom, scrollToBottom]);

    // Adjust scroll position when late content changes layout
    useEffect(() => {
        if (mode !== "agent") return;
        
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
    }, [mode, isNearBottom, scrollToBottom, messages]);

    const handleSubmit = () => {
        if (mode === "landing") {
            handleLandingSubmit();
        } else {
            sendMessage();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() || (mode === "landing" && tempUploads.length > 0)) {
                handleSubmit();
            }
        }
    };

    // Render agent mode (with history)
    if (mode === "agent") {
        return (
            <div className={cn("flex h-full w-full flex-col", className)}>
                <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        role="log"
                        aria-live="polite"
                        aria-relevant="additions"
                        className="flex-1 overflow-y-auto px-4 md:px-6 py-4"
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
                                                {...(m.agent ? { agent: m.agent } : {})}
                                                ref={isLast ? lastMessageRef : undefined}
                                                {...(messageTabIndex !== undefined ? { tabIndex: messageTabIndex } : {})}
                                                isGroupStart={isGroupStart}
                                                isGroupEnd={isGroupEnd}
                                                timestamp={displayTimestamp}
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
                                <ArrowDown className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                {chatTranslations("jumpToNewest")}
                            </Button>
                        </div>
                    ) : null}
                </div>
                
                {/* Composer for agent mode - enhanced with controls */}
                <div className="sticky bottom-0 w-full border-t border-border bg-background px-4 md:px-6 py-3">
                    <div className="space-y-2">
                        {/* Attached files preview */}
                        {attachedFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {attachedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border"
                                    >
                                        {file.preview ? (
                                            <img
                                                src={file.preview}
                                                alt={file.name}
                                                className="w-8 h-8 object-cover rounded"
                                            />
                                        ) : (
                                            <FileText className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-foreground truncate">
                                                {file.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {Math.round(file.size / 1024)} KB
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveAttachedFile(index)}
                                            className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                                            aria-label="Remove file"
                                        >
                                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Main composer */}
                        <div className="relative">
                            <Textarea
                                ref={textareaRef}
                                value={value}
                                onChange={(e) => {
                                    setValue(e.target.value);
                                    adjustHeight();
                                }}
                                onKeyDown={handleKeyDown}
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
                                    onClick={handleSubmit}
                                    disabled={!value.trim() || isTyping}
                                    className={cn(
                                        "h-9 w-9 rounded-lg",
                                        value.trim() && !isTyping
                                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                            : "bg-muted text-muted-foreground cursor-not-allowed"
                                    )}
                                >
                                    <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
                                    <span className="sr-only">Send</span>
                                </Button>
                            </div>
                        </div>

                        {/* Controls bar */}
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
                                        {selectedAgent === "sourcing" && <Search className="w-4 h-4 text-primary" aria-hidden="true" />}
                                        {selectedAgent === "analysis" && <Code2 className="w-4 h-4 text-primary" aria-hidden="true" />}
                                        {selectedAgent === "creative" && <Puzzle className="w-4 h-4 text-primary" aria-hidden="true" />}
                                        <span className="font-medium capitalize">
                                            {selectedAgent}
                                        </span>
                                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
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
                                                        className={cn(
                                                            "w-full flex items-center gap-2 px-3 py-2 text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                                                            selectedAgent === agent.id && "bg-accent text-accent-foreground"
                                                        )}
                                                    >
                                                        <agent.icon className="w-4 h-4" aria-hidden="true" />
                                                        <span className="text-sm">{agent.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* File attachment button */}
                                <button
                                    type="button"
                                    onClick={handleAgentFileClick}
                                    className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    aria-label="Attach file"
                                >
                                    <Paperclip className="w-4 h-4" aria-hidden="true" />
                                </button>

                                {/* Image button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        agentFileInputRef.current?.click();
                                    }}
                                    className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    aria-label="Add image"
                                >
                                    <ImageLucide className="w-4 h-4" aria-hidden="true" />
                                </button>
                            </div>

                            {/* Right info */}
                            <div className="text-xs text-muted-foreground">
                                Press <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border text-[10px]">⏎</kbd> to send
                            </div>
                        </div>
                    </div>

                    {/* Hidden file input */}
                    <input
                        type="file"
                        ref={agentFileInputRef}
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={handleAgentFileChange}
                        style={{ display: 'none' }}
                    />
                </div>
            </div>
        );
    }

    // ✅ FUSIÓN CRÍTICA: Render landing mode (composer only) - Estructura del equipo + lógica de múltiples PDFs
    return (
        <div className={cn(
            "w-full",
            mode === "landing" && "max-w-2xl md:max-w-2xl xl:max-w-[56rem] mx-auto",
            className
        )}>
            <div className={cn(
                "relative",
                mode === "landing" 
                    ? "bg-muted/90 rounded-2xl border border-border/60 shadow-sm backdrop-blur-sm" 
                    : "bg-background rounded-lg border border-input"
            )}>
                <div className="overflow-y-auto">
                    <Textarea
                        id="hero-chat-input"
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            adjustHeight();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe your client or drop a policy PDF..."
                        aria-label="Describe your client or drop a policy PDF"
                        className={cn(
                            "w-full px-5 py-4",
                            "resize-none",
                            "bg-transparent",
                            "border-none",
                            mode === "landing" 
                                ? "text-foreground text-lg placeholder:text-muted-foreground/70 placeholder:text-lg"
                                : "text-foreground text-base placeholder:text-muted-foreground",
                            "focus:outline-none",
                            "focus-visible:ring-0 focus-visible:ring-offset-0",
                            "min-h-[90px]"
                        )}
                        style={{
                            overflow: "hidden",
                        }}
                    />
                    
                    {/* ✅ FUSIÓN CRÍTICA: PDF upload indicators (múltiples PDFs) */}
                    {tempUploads.length > 0 && (
                        <div className="mx-5 mb-4 space-y-2">
                            {tempUploads.map((upload, index) => (
                                <div
                                    key={upload.storagePath}
                                    className={cn(
                                        "p-3 flex items-center justify-between",
                                        mode === "landing"
                                            ? "rounded-lg bg-green-500/10 border border-green-500/20"
                                            : "rounded-md bg-green-50 border border-green-200"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-2",
                                            mode === "landing" 
                                                ? "rounded-lg bg-green-500/20"
                                                : "rounded bg-green-100"
                                        )}>
                                            <FileText className={cn(
                                                "w-4 h-4",
                                                mode === "landing" ? "text-green-500" : "text-green-600"
                                            )} aria-hidden="true" />
                                        </div>
                                        <div className="flex-1">
                                            <div className={cn(
                                                "text-sm font-medium",
                                                mode === "landing" ? "text-foreground" : "text-foreground"
                                            )}>
                                                {upload.name}
                                            </div>
                                            <div className={cn(
                                                "text-xs",
                                                mode === "landing" ? "text-muted-foreground" : "text-muted-foreground"
                                            )}>
                                                {Math.round(upload.size / 1024)} KB • {upload.pages} pages
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveFile(upload.storagePath)}
                                        className={cn(
                                            "p-1 rounded-full transition-colors",
                                            mode === "landing"
                                                ? "hover:bg-accent text-muted-foreground hover:text-foreground"
                                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                        )}
                                        aria-label="Remove file"
                                    >
                                        <X className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Press Enter to send message */}
                <div className={cn(
                    "px-5 py-2 text-xs",
                    mode === "landing" 
                        ? "text-muted-foreground/60" 
                        : "text-muted-foreground"
                )}>
                    Press Enter to send
                </div>

                <div className={cn(
                    "flex items-center justify-between p-4 border-t",
                    mode === "landing" ? "border-border/50" : "border-border"
                )}>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleUploadClick}
                            disabled={isUploading}
                            aria-label="Attach PDF"
                            className={cn(
                                "group p-2 rounded-lg transition-colors flex items-center gap-1",
                                mode === "landing" 
                                    ? "hover:bg-accent"
                                    : "hover:bg-muted"
                            )}
                        >
                            {isUploading ? (
                                <div className="w-4 h-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                            ) : (
                                <Paperclip className={cn(
                                    "w-4 h-4",
                                    mode === "landing" ? "text-foreground" : "text-foreground"
                                )} aria-hidden="true" />
                            )}
                            <span className={cn(
                                "text-xs hidden group-hover:inline transition-opacity",
                                mode === "landing" ? "text-muted-foreground" : "text-muted-foreground"
                            )}>
                                {isUploading ? 'Uploading...' : 'Attach PDF'}
                            </span>
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!value.trim() && tempUploads.length === 0}
                            className={cn(
                                "px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-1",
                                mode === "landing"
                                    ? "border border-border/50 hover:border-border hover:bg-accent"
                                    : "border border-input hover:bg-muted",
                                (value.trim() || tempUploads.length > 0)
                                    ? mode === "landing" 
                                        ? "bg-primary text-primary-foreground" 
                                        : "bg-primary text-primary-foreground"
                                    : mode === "landing"
                                        ? "text-muted-foreground cursor-not-allowed"
                                        : "text-muted-foreground cursor-not-allowed"
                            )}
                        >
                            <ArrowUpIcon
                                className={cn(
                                    "w-4 h-4",
                                    (value.trim() || tempUploads.length > 0)
                                        ? mode === "landing" ? "text-primary-foreground" : "text-primary-foreground"
                                        : mode === "landing" ? "text-muted-foreground" : "text-muted-foreground"
                                )}
                                aria-hidden="true"
                            />
                            <span className="sr-only">Send</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ✅ FUSIÓN CRÍTICA: Action buttons - solo en modo landing (del LandingChatInput original) */}
            {mode === "landing" && (
                <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
                    <button
                        type="button"
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full border transition-colors text-sm",
                            tempUploads.length > 0
                                ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                                : "bg-background/80 hover:bg-accent border-border/50 text-muted-foreground hover:text-foreground",
                            isUploading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <FileUp className="w-4 h-4" aria-hidden="true" />
                        <span className="text-xs">
                            {isUploading ? 'Uploading...' : tempUploads.length > 0 ? `✓ ${tempUploads.length} PDF${tempUploads.length > 1 ? 's' : ''} Loaded` : 'Upload PDF'}
                        </span>
                    </button>
                    <ActionButton
                        icon={<ImageIcon className="w-4 h-4" aria-hidden="true" />}
                        label="Import WhatsApp chat"
                        user={user}
                        onAuthenticatedClick={() => setStep("conversation")}
                    />
                    <ActionButton
                        icon={<MonitorIcon className="w-4 h-4" aria-hidden="true" />}
                        label="Connect carriers"
                        user={user}
                        onAuthenticatedClick={() => setStep("conversation")}
                    />
                </div>
            )}
            
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                accept=".pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
        </div>
    );
}

// ✅ FUSIÓN CRÍTICA: ActionButton component (del LandingChatInput original)
interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
    user: User | null;
    onAuthenticatedClick: () => void;
}

function ActionButton({ icon, label, user, onAuthenticatedClick }: ActionButtonProps) {
    const handleClick = () => {
        if (!user) {
            window.location.href = '/login';
            return;
        }
        onAuthenticatedClick();
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className="flex items-center gap-2 px-4 py-2 bg-background/80 hover:bg-accent rounded-full border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
        >
            {icon}
            <span className="text-xs">{label}</span>
        </button>
    );
}

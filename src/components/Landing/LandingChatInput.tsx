'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Paperclip, Sparkles, FileText, X, ArrowUpIcon, ImageIcon, MonitorIcon, FileUp } from 'lucide-react';
import { useUI } from '@/lib/ui/state';
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// Función para tracking de eventos (analytics)
const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  console.log('📊 Track Event:', eventName, properties);
};

// Hook personalizado para auto-resize del textarea (del original v0-ai-chat)
const useAutoResizeTextarea = ({ minHeight, maxHeight }: { minHeight: number; maxHeight?: number }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = "auto";

        const newHeight = Math.max(
            minHeight,
            Math.min(
                textarea.scrollHeight,
                maxHeight ?? Number.POSITIVE_INFINITY
            )
        );

        textarea.style.height = `${newHeight}px`;
    }, [minHeight, maxHeight]);

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
};

export function LandingChatInput() {
    const [value, setValue] = useState("");
    const [user, setUser] = useState<User | null>(null);
    
    // ✅ FUSIÓN CRÍTICA: Agregar setInitialMessage que faltaba
    const { setStep, setInitialMessage, setBrief } = useUI();
    
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 90,
        maxHeight: 200,
    });
    
    // PDF upload state (conservar del original)
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [tempUploads, setTempUploads] = useState<Array<{
        id: string;
        storagePath: string;
        fileName: string;
        fileSize: number;
        pageCount?: number;
        charactersExtracted?: number;
        fileHash?: string;
        extractedText?: string;  // ← AÑADIDO: Texto completo del PDF
    }>>([]);

    useEffect(() => {
        const supabase = createBrowserSupabase();
        const checkUser = async () => {
            const { data } = await supabase.auth.getUser();
            setUser(data.user);
        };
        checkUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setUser(session?.user ?? null);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // PDF upload handlers (conservar del original funcionando)
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

            if (result.success && result.mode === 'temp' && result.tempUpload) {
                setTempUploads((prev) => [...prev, result.tempUpload]);
                console.log('✅ Upload temporal listo:', result.tempUpload);
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
        setTempUploads((prev) => prev.filter(t => t.storagePath !== storagePath));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async () => {
        // La verificación de autenticación es crucial.
        if (!user) {
            console.error('❌ User not authenticated');
            window.location.href = '/login'; // O mostrar un modal de login.
            return;
        }
        
        console.log('✅ User authenticated:', user.id);

        const message = value.trim();
        if (!message && tempUploads.length === 0) return;

        // Limpiar estado local antes de la transición.
        setValue('');
        setTempUploads([]);
        trackEvent("hero_chat_start", { hasText: Boolean(message), hasPDF: tempUploads.length > 0 });

        // --- NUEVO FLUJO DIRECTO ---
        // Crear caso en la base de datos primero
        try {
            console.log('🚀 Creating case from LandingPage with message:', message);
            
            // Primero obtener los datos del usuario autenticado
            const authResponse = await fetch('/api/auth/me');
            if (!authResponse.ok) {
                throw new Error('Failed to get user data');
            }
            const { userId, orgId } = await authResponse.json();
            console.log('👤 User data:', { userId, orgId });
            
            const response = await fetch('/api/cases/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orgId,
                    userId,
                    briefData: { freeText: message },
                    clientName: 'Cliente desde Landing',
                    businessType: 'Por definir',
                    employees: 0,
                    status: 'draft',
                    stage: 'initial'
                })
            });

            console.log('📡 Case creation response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Case created successfully:', result);
                // Guardar el caseId en el estado global
                useUI.getState().setCurrentCaseId(result.caseId);
                console.log('💾 currentCaseId set to:', result.caseId);
            } else {
                const errorData = await response.json();
                console.error('❌ Case creation failed:', errorData);
            }
        } catch (error) {
            console.error('❌ Error creating case:', error);
        }

        // Guarda el mensaje inicial y el brief en el store de Zustand.
        setInitialMessage(message);
        setBrief({ freeText: message });
        // Navega directamente a la vista de conversación del agente.
        setStep("conversation");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
                handleSubmit();
            }
        }
    };

    return (
        <div className="w-full">
            {/* Input oculto para upload de archivos */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
            />
            
            {/* Diseño original de v0-ai-chat conservado */}
            <div className="relative bg-neutral-900 rounded-xl border border-neutral-800">
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
                            "text-white text-lg",
                            "focus:outline-none",
                            "focus-visible:ring-0 focus-visible:ring-offset-0",
                            "placeholder:text-neutral-500 placeholder:text-lg",
                            "min-h-[90px]"
                        )}
                        style={{
                            overflow: "hidden",
                        }}
                    />
                    
                    {/* PDF upload indicator (conservar diseño original) */}
                    {tempUploads.length > 0 && (
                        <div className="mx-5 mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between">
                            <div className="flex flex-col gap-2 w-full">
                                {tempUploads.map(t => (
                                    <div key={t.storagePath} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-green-500/20">
                                                <FileText className="w-4 h-4 text-green-400" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-white text-sm font-medium">{t.fileName}</div>
                                                <div className="text-neutral-400 text-xs">
                                                    {Math.round(t.fileSize / 1024)} KB {t.pageCount ? `• ${t.pageCount} pages` : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveFile(t.storagePath)}
                                            className="p-1 rounded-full hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
                                            aria-label="Remove file"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between p-4 border-t border-neutral-800">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleUploadClick}
                            disabled={isUploading}
                            aria-label="Upload PDF"
                            className="group p-2 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1"
                        >
                            {isUploading ? (
                                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <Paperclip className="w-4 h-4 text-white" />
                            )}
                            <span className="text-xs text-zinc-400 hidden group-hover:inline transition-opacity">
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
                                "px-3 py-2 rounded-lg text-sm transition-colors border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 flex items-center justify-between gap-1",
                                (value.trim() || tempUploads.length > 0)
                                    ? "bg-white text-black"
                                    : "text-zinc-400 cursor-not-allowed"
                            )}
                        >
                            <ArrowUpIcon
                                className={cn(
                                    "w-4 h-4",
                                    (value.trim() || tempUploads.length > 0)
                                        ? "text-black"
                                        : "text-zinc-400"
                                )}
                            />
                            <span className="sr-only">Send</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ✅ BOTONES DE ACCIÓN RESTAURADOS - Sección que faltaba en la fusión */}
            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                <button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full border transition-colors",
                        tempUploads.length > 0
                            ? "bg-green-500/20 border-green-500/30 text-green-400"
                            : "bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-white",
                        isUploading && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <FileUp className="w-4 h-4" />
                    <span className="text-xs">
                        {isUploading ? 'Uploading...' : tempUploads.length > 0 ? '✓ PDF Loaded' : 'Upload PDF'}
                    </span>
                </button>
                
                {/* Botón Import WhatsApp chat */}
                <ActionButton
                    icon={<ImageIcon className="w-4 h-4" />}
                    label="Import WhatsApp chat"
                    user={user}
                    onAuthenticatedClick={() => {
                        // Funcionalidad temporalmente deshabilitada
                        console.log("Import WhatsApp chat - Funcionalidad en desarrollo");
                    }}
                />
                
                {/* Botón Connect carriers */}
                <ActionButton
                    icon={<MonitorIcon className="w-4 h-4" />}
                    label="Connect carriers"
                    user={user}
                    onAuthenticatedClick={() => {
                        // Funcionalidad temporalmente deshabilitada
                        console.log("Connect carriers - Funcionalidad en desarrollo");
                    }}
                />
            </div>
        </div>
    );
}

// ✅ COMPONENTE ACTIONBUTTON RESTAURADO - Patrón reutilizable para botones de acción
interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
    user: User | null;
    onAuthenticatedClick: () => void;
}

function ActionButton({ icon, label, user, onAuthenticatedClick }: ActionButtonProps) {
    const handleClick = () => {
        // Check if user is authenticated
        if (!user) {
            window.location.href = '/login';
            return;
        }
        
        // For authenticated users, call the authenticated click handler
        onAuthenticatedClick();
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-full border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
        >
            {icon}
            <span className="text-xs">{label}</span>
        </button>
    );
}
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    ImageIcon,
    FileUp,
    Figma,
    MonitorIcon,
    CircleUserRound,
    ArrowUpIcon,
    Paperclip,
    PlusIcon,
    FileText,
    X,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useUI } from "@/lib/ui/state";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/components/AuthProvider";

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

export function VercelV0Chat() {
    const [value, setValue] = useState("");
    const { user } = useAuth();
    const { setStep, setBrief } = useUI();
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 90,
        maxHeight: 200,
    });
    
    // PDF upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<{
        name: string;
        size: number;
        text: string;
        pages: number;
    } | null>(null);

    // PDF upload handlers
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
                setUploadedFile({
                    name: result.metadata.name,
                    size: result.metadata.size,
                    text: result.text,
                    pages: result.metadata.pages
                });
                
                console.log('📖 Texto extraído:', result.text.substring(0, 200) + '...');
                console.log('✅ Archivo guardado en estado para envío');
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

    const handleRemoveFile = () => {
        setUploadedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = () => {
        // Check if user is authenticated
        if (!user) {
            window.location.href = '/login';
            return;
        }
        
        // For authenticated users, go to conversation
        let fullMessage = value.trim();
        if (uploadedFile) {
            fullMessage += `\n\n📄 DOCUMENTO PDF ADJUNTO: ${uploadedFile.name}\n`;
        }
        
        if (fullMessage) {
            setBrief({ freeText: fullMessage });
        }
        trackEvent("hero_chat_start", { hasText: Boolean(value.trim()), hasPDF: Boolean(uploadedFile) });
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
                    
                    {/* PDF upload indicator */}
                    {uploadedFile && (
                        <div className="mx-5 mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/20">
                                    <FileText className="w-4 h-4 text-green-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-white text-sm font-medium">
                                        {uploadedFile.name}
                                    </div>
                                    <div className="text-neutral-400 text-xs">
                                        {Math.round(uploadedFile.size / 1024)} KB • {uploadedFile.pages} pages
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleRemoveFile}
                                className="p-1 rounded-full hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
                                aria-label="Remove file"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between p-4 border-t border-neutral-800">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            aria-label="Attach"
                            className="group p-2 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <Paperclip className="w-4 h-4 text-white" />
                            <span className="text-xs text-zinc-400 hidden group-hover:inline transition-opacity">
                                Attach
                            </span>
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!value.trim() && !uploadedFile}
                            className={cn(
                                "px-3 py-2 rounded-lg text-sm transition-colors border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 flex items-center justify-between gap-1",
                                (value.trim() || uploadedFile)
                                    ? "bg-white text-black"
                                    : "text-zinc-400 cursor-not-allowed"
                            )}
                        >
                            <ArrowUpIcon
                                className={cn(
                                    "w-4 h-4",
                                    (value.trim() || uploadedFile)
                                        ? "text-black"
                                        : "text-zinc-400"
                                )}
                            />
                            <span className="sr-only">Send</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                <button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full border transition-colors",
                        uploadedFile
                            ? "bg-green-500/20 border-green-500/30 text-green-400"
                            : "bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-white",
                        isUploading && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <FileUp className="w-4 h-4" />
                    <span className="text-xs">
                        {isUploading ? 'Uploading...' : uploadedFile ? '✓ PDF Loaded' : 'Upload PDF'}
                    </span>
                </button>
                <ActionButton
                    icon={<ImageIcon className="w-4 h-4" />}
                    label="Import WhatsApp chat"
                    user={user}
                    onAuthenticatedClick={() => setStep("conversation")}
                />
                <ActionButton
                    icon={<MonitorIcon className="w-4 h-4" />}
                    label="Connect carriers"
                    user={user}
                    onAuthenticatedClick={() => setStep("conversation")}
                />
            </div>
            
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



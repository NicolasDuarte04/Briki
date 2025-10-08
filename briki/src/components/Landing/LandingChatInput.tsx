'use client';

import { useState, useRef } from 'react';
import { Upload, Paperclip, Sparkles, FileText, X, ArrowUpIcon, FileUp, ImageIcon, MonitorIcon } from 'lucide-react';
import { useUI } from '@/lib/ui/state';

export function LandingChatInput() {
  const { setStep, setInitialMessage, setBrief } = useUI();
  const [message, setMessage] = useState('');
  
  // 📁 Referencias y estado para upload de archivos
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    text: string;
    pages: number;
  } | null>(null);
  
  // Debug: verificar el estado de Zustand
  console.log('🔍 LandingChatInput: Estado de Zustand:', { setStep, setInitialMessage, setBrief });

  const handleWhatsAppImport = () => {
    setStep('conversation');
  };

  const handleSendMessage = () => {
    if (message.trim() || uploadedFile) {
      console.log('🚀 LandingChatInput: Enviando mensaje:', message.trim());
      console.log('🚀 LandingChatInput: Archivo PDF:', uploadedFile?.name);
      
      // Crear mensaje combinado
      let fullMessage = message.trim();
      if (uploadedFile) {
        fullMessage += `\n\n📄 DOCUMENTO PDF ADJUNTO: 🟢 ${uploadedFile.name} 🟢\n`;
      }
      
      // Actualizar tanto initialMessage como brief.freeText
      setInitialMessage(fullMessage);
      setBrief({ freeText: fullMessage });
      
      console.log('🚀 LandingChatInput: SetInitialMessage y setBrief llamados');
      setStep('conversation');
      console.log('🚀 LandingChatInput: SetStep llamado');
    }
  };

  // 🗑️ Función para remover archivo subido
  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 📁 Función para abrir el selector de archivos
  const handleUploadClick = () => {
    console.log('📁 Frontend: Abriendo selector de archivos...');
    fileInputRef.current?.click();
  };

  // 📄 Función para procesar el archivo seleccionado
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📄 Frontend: Archivo seleccionado:', file.name, file.type, file.size);
    setIsUploading(true);

    try {
      // 📡 Crear FormData
      const formData = new FormData();
      formData.append('pdf', file);
      console.log('📡 Frontend: FormData creado');

      // 🚀 Enviar al endpoint
      console.log('🚀 Frontend: Enviando a /api/upload/pdf...');
      const response = await fetch('/api/upload/pdf', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      console.log('📡 Frontend: Respuesta recibida:', result);

      if (result.success) {
        // 📁 Guardar información del archivo subido
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
      event.target.value = ''; // Limpiar input
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className="rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] bg-gray-800"
      >
        {/* Input Area */}
        <div className="px-8 pt-8 pb-6">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your client or drop a policy PDF..."
            aria-label="Describe your client or drop a policy PDF"
            className="w-full bg-transparent text-white placeholder:text-gray-400 resize-none outline-none text-subhead min-h-[100px]"
          />
          
          {/* 📄 Indicador de PDF subido - MANTENEMOS NUESTRA LÓGICA */}
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
                    {Math.round(uploadedFile.size / 1024)} KB • {uploadedFile.pages} páginas • Listo para enviar
                  </div>
                </div>
              </div>
              <button
                onClick={handleRemoveFile}
                className="p-1 rounded-full hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
                aria-label="Remover archivo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-8 pb-8 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={isUploading}
              className="p-2.5 rounded-lg transition-colors bg-[var(--briki-primary)] hover:opacity-90"
              aria-label="Upload PDF"
            >
              <Upload className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!message.trim() && !uploadedFile}
              className={`p-2.5 rounded-lg transition-colors ${
                (message.trim() || uploadedFile)
                  ? "bg-white text-slate-900 hover:bg-slate-100"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
              aria-label="Send message"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Input de archivo oculto - MANTENEMOS NUESTRA LÓGICA */}
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


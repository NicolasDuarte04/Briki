'use client';

import { useState, useRef } from 'react';
import { Wrench, Upload, Paperclip, Sparkles, FileText, X } from 'lucide-react';
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
        fullMessage += `\n\n📄 DOCUMENTO PDF ADJUNTO: ${uploadedFile.name}\n${uploadedFile.text}`;
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
          
          {/* 📄 Indicador de PDF subido */}
          {uploadedFile && (
            <div className="mt-4 p-3 rounded-lg bg-white/10 border border-white/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <FileText className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">
                    {uploadedFile.name}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {Math.round(uploadedFile.size / 1024)} KB • {uploadedFile.pages} páginas • Listo para enviar
                  </div>
                </div>
              </div>
              <button
                onClick={handleRemoveFile}
                className="p-1 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                aria-label="Remover archivo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="px-8 py-5 border-t border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white text-sm">
              <Wrench className="w-4 h-4" />
              Tools
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white text-sm">
              <Upload className="w-4 h-4" />
              Import
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
              aria-label="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() && !uploadedFile}
              className={`p-2.5 rounded-lg transition-colors bg-[var(--briki-primary)] hover:opacity-90 ${
                uploadedFile ? 'ring-2 ring-green-400/50' : ''
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={uploadedFile ? "Generate with AI (PDF attached)" : "Generate with AI"}
              title={uploadedFile ? `PDF ${uploadedFile.name} listo para enviar` : "Generate with AI"}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Helper chips */}
      <div className="flex items-center gap-4 mt-6 justify-center">
        <button 
          onClick={handleUploadClick}
          disabled={isUploading}
          className={`px-5 py-2.5 rounded-full backdrop-blur-sm text-sm transition-colors disabled:opacity-50 ${
            uploadedFile 
              ? 'bg-green-500/20 text-green-400 border border-green-400/30' 
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {isUploading ? 'Subiendo...' : uploadedFile ? '✅ PDF cargado' : 'Upload PDF'}
        </button>
        <button 
          onClick={handleWhatsAppImport}
          className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm hover:bg-white/20 transition-colors"
        >
          Import WhatsApp chat
        </button>
      </div>

      {/* Input de archivo oculto */}
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


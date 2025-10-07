'use client';

import { useState } from 'react';
import { Wrench, Upload, Paperclip, Sparkles } from 'lucide-react';
import { useUI } from '@/lib/ui/state';

export function LandingChatInput() {
  const { setStep, setInitialMessage, setBrief } = useUI();
  const [message, setMessage] = useState('');
  
  // Debug: verificar el estado de Zustand
  console.log('🔍 LandingChatInput: Estado de Zustand:', { setStep, setInitialMessage, setBrief });

  const handleWhatsAppImport = () => {
    setStep('conversation');
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log('🚀 LandingChatInput: Enviando mensaje:', message.trim());
      console.log('🚀 LandingChatInput: setInitialMessage function:', setInitialMessage);
      
      // Actualizar tanto initialMessage como brief.freeText
      setInitialMessage(message.trim());
      setBrief({ freeText: message.trim() });
      
      console.log('🚀 LandingChatInput: SetInitialMessage y setBrief llamados');
      setStep('conversation');
      console.log('🚀 LandingChatInput: SetStep llamado');
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
        className="rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
        style={{ backgroundColor: '#1F2937' }}
      >
        {/* Input Area */}
        <div className="px-8 pt-8 pb-6">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your client or drop a policy PDF..."
            aria-label="Describe your client or drop a policy PDF"
            className="w-full bg-transparent text-white placeholder:text-gray-400 resize-none outline-none"
            style={{
              fontSize: '1.125rem',
              lineHeight: '1.6',
              minHeight: '100px',
            }}
          />
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
              className="p-2.5 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--briki-primary)' }}
              aria-label="Generate with AI"
            >
              <Sparkles className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Helper chips */}
      <div className="flex items-center gap-4 mt-6 justify-center">
        <button className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm hover:bg-white/20 transition-colors">
          Upload PDF
        </button>
        <button 
          onClick={handleWhatsAppImport}
          className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm hover:bg-white/20 transition-colors"
        >
          Import WhatsApp chat
        </button>
      </div>
    </div>
  );
}


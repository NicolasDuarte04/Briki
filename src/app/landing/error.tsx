'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface LandingErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary específico para /landing
 * 
 * Captura errores de:
 * - Carga de componentes del landing
 * - Errores de hidratación
 * - Problemas con traducciones
 * 
 * Diseñado para mantener la estética del landing mientras muestra el error.
 */
export default function LandingError({ error, reset }: LandingErrorProps) {
  useEffect(() => {
    // Log del error para debugging (solo en desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      console.error('[LandingError] Error capturado:', error);
    }
  }, [error]);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(21, 26, 30, 1)', color: 'rgba(245, 250, 255, 1)' }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icono */}
        <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-white/80" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-semibold text-white/90">
          Algo salió mal
        </h1>

        {/* Mensaje */}
        <p className="text-white/60">
          Hubo un problema cargando esta página. Por favor, intenta recargar.
        </p>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={reset} 
            className="gap-2 bg-white text-[#050505] hover:bg-white/90"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </Button>
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="gap-2 border-white/20 text-white hover:bg-white/10"
          >
            Ir al Inicio
          </Button>
        </div>

        {/* ID de error para soporte */}
        {error.digest && (
          <p className="text-xs text-white/40">
            ID de error: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

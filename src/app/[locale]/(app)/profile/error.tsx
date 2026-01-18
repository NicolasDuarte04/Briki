'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ProfileErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary específico para /profile
 * 
 * Captura errores de:
 * - Desencriptación de datos PII (name, phone, address)
 * - Conexión a base de datos
 * - Timeout de transacciones Prisma
 * 
 * Permite al usuario reintentar o navegar a una ruta segura.
 */
export default function ProfileError({ error, reset }: ProfileErrorProps) {
  useEffect(() => {
    // Log del error para debugging (solo en desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ProfileError] Error capturado:', error);
    }
  }, [error]);

  // Detectar tipo de error para mensaje específico
  const isConnectionError = 
    error.message?.includes('P2024') || 
    error.message?.includes('connection') ||
    error.message?.includes('timeout');
  
  const isEncryptionError = 
    error.message?.includes('encrypt') || 
    error.message?.includes('decrypt') ||
    error.message?.includes('APP_ENCRYPTION_KEY');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icono */}
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-semibold text-foreground">
          Error al cargar tu perfil
        </h1>

        {/* Mensaje específico según tipo de error */}
        <p className="text-muted-foreground">
          {isConnectionError && (
            'Hubo un problema de conexión con el servidor. Esto puede ser temporal.'
          )}
          {isEncryptionError && (
            'Hubo un problema al procesar tus datos. Por favor, intenta de nuevo.'
          )}
          {!isConnectionError && !isEncryptionError && (
            'Ocurrió un error inesperado. Nuestro equipo ha sido notificado.'
          )}
        </p>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              <Home className="w-4 h-4" />
              Ir al Dashboard
            </Link>
          </Button>
        </div>

        {/* ID de error para soporte */}
        {error.digest && (
          <p className="text-xs text-muted-foreground/60">
            ID de error: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

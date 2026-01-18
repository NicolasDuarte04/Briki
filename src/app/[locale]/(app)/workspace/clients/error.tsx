'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home, Users } from 'lucide-react';
import Link from 'next/link';

interface ClientsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary específico para /workspace/clients
 * 
 * Captura errores de:
 * - Desencriptación de datos de clientes (name_enc, email_enc, etc.)
 * - Conexión a base de datos
 * - Timeout de transacciones Prisma
 * - Errores de getCurrentOrg
 * 
 * Permite al usuario reintentar o navegar a una ruta segura.
 */
export default function ClientsError({ error, reset }: ClientsErrorProps) {
  useEffect(() => {
    // Log del error para debugging (solo en desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ClientsError] Error capturado:', error);
    }
  }, [error]);

  // Detectar tipo de error para mensaje específico
  const isConnectionError = 
    error.message?.includes('P2024') || 
    error.message?.includes('P1001') ||
    error.message?.includes('connection') ||
    error.message?.includes('timeout') ||
    error.message?.includes('Database');
  
  const isOrgError = 
    error.message?.includes('organization') || 
    error.message?.includes('getCurrentOrg');

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icono */}
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-semibold text-foreground">
          Error al cargar clientes
        </h1>

        {/* Mensaje específico según tipo de error */}
        <p className="text-muted-foreground">
          {isConnectionError && (
            'Hubo un problema de conexión con la base de datos. Esto puede ser temporal.'
          )}
          {isOrgError && !isConnectionError && (
            'No se pudo verificar tu organización. Por favor, inicia sesión nuevamente.'
          )}
          {!isConnectionError && !isOrgError && (
            'Ocurrió un error inesperado al cargar la lista de clientes.'
          )}
        </p>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/workspace/cases">
              <Users className="w-4 h-4" />
              Ver Casos
            </Link>
          </Button>
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/dashboard">
              <Home className="w-4 h-4" />
              Dashboard
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

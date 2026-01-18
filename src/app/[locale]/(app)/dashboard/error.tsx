'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import Link from 'next/link';

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary específico para /dashboard
 * 
 * Captura errores de:
 * - Carga de estadísticas
 * - Conexión a base de datos
 * - Errores de getCurrentOrg
 * - Timeout de consultas
 * 
 * Permite al usuario reintentar o cerrar sesión si hay problemas de auth.
 */
export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    // Log del error para debugging (solo en desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      console.error('[DashboardError] Error capturado:', error);
    }
  }, [error]);

  // Detectar tipo de error para mensaje específico
  const isConnectionError = 
    error.message?.includes('P2024') || 
    error.message?.includes('P1001') ||
    error.message?.includes('connection') ||
    error.message?.includes('timeout') ||
    error.message?.includes('Database');
  
  const isAuthError = 
    error.message?.includes('Unauthorized') || 
    error.message?.includes('auth') ||
    error.message?.includes('session');

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icono */}
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-semibold text-foreground">
          Error al cargar el dashboard
        </h1>

        {/* Mensaje específico según tipo de error */}
        <p className="text-muted-foreground">
          {isConnectionError && (
            'Hubo un problema de conexión con el servidor. Esto puede ser temporal, intenta de nuevo.'
          )}
          {isAuthError && !isConnectionError && (
            'Tu sesión puede haber expirado. Por favor, inicia sesión nuevamente.'
          )}
          {!isConnectionError && !isAuthError && (
            'Ocurrió un error inesperado. Nuestro equipo ha sido notificado.'
          )}
        </p>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </Button>
          {isAuthError && (
            <Button asChild variant="outline" className="gap-2">
              <Link href="/login">
                <LogOut className="w-4 h-4" />
                Iniciar Sesión
              </Link>
            </Button>
          )}
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

'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

interface CompaniesErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary específico para /workspace/companies
 * 
 * Captura errores de:
 * - Desencriptación de datos de empresas (legal_name_enc, nit_enc, etc.)
 * - Conexión a base de datos
 * - Timeout de transacciones Prisma
 * - Errores de getCurrentOrg
 * 
 * Permite al usuario reintentar o navegar a una ruta segura.
 */
export default function CompaniesError({ error, reset }: CompaniesErrorProps) {
  const locale = useLocale();

  useEffect(() => {
    // Log del error para debugging (solo en desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      console.error('[CompaniesError] Error capturado:', error);
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

  const isEncryptionError =
    error.message?.includes('encrypt') ||
    error.message?.includes('decrypt') ||
    error.message?.includes('APP_ENCRYPTION_KEY');

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icono */}
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-semibold text-foreground">
          Error al cargar empresas
        </h1>

        {/* Mensaje específico según tipo de error */}
        <p className="text-muted-foreground">
          {isConnectionError && (
            <>
              No pudimos conectar con la base de datos. 
              Esto puede ser temporal, intenta de nuevo en unos momentos.
            </>
          )}
          {isOrgError && (
            <>
              No se pudo determinar tu organización actual. 
              Por favor, selecciona una organización o contacta soporte.
            </>
          )}
          {isEncryptionError && (
            <>
              Error al procesar datos cifrados.
              Verifica la configuración de seguridad o contacta soporte.
            </>
          )}
          {!isConnectionError && !isOrgError && !isEncryptionError && (
            <>
              Hubo un problema al cargar las empresas. 
              Por favor intenta de nuevo o contacta soporte si el problema persiste.
            </>
          )}
        </p>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </Button>
          
          <Link href={`/${locale}/dashboard`}>
            <Button variant="outline" className="gap-2 w-full">
              <Home className="w-4 h-4" />
              Ir al Dashboard
            </Button>
          </Link>
        </div>

        {/* Error digest para soporte */}
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Código de error: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

// Timeout para detectar problemas de carga (15 segundos)
const LOAD_TIMEOUT_MS = 15000;

// Importación dinámica para el componente client-side
const CompanyForm = dynamic(() => import('./CompanyForm').then(mod => ({ default: mod.CompanyForm })), {
  ssr: false,
  loading: () => <FormLoadingSkeleton />
});

/** Skeleton de carga mejorado con indicador visual claro */
function FormLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Security Notice Skeleton */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3 items-center">
          <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
          <div>
            <div className="h-4 w-48 bg-blue-200 dark:bg-blue-800 rounded animate-pulse" />
            <div className="h-3 w-64 bg-blue-100 dark:bg-blue-900 rounded mt-2 animate-pulse" />
          </div>
        </div>
      </div>
      
      {/* Tabs Skeleton */}
      <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
      
      {/* Form Card Skeleton */}
      <div className="border rounded-lg p-6 space-y-4">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
      
      {/* Navigation Skeleton */}
      <div className="flex justify-between pt-4 border-t">
        <div className="h-10 w-24 bg-muted rounded animate-pulse" />
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>
      
      {/* Loading indicator text */}
      <p className="text-center text-sm text-muted-foreground">
        Cargando formulario...
      </p>
    </div>
  );
}

/** Mensaje de error si la carga tarda demasiado */
function LoadTimeoutWarning({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-6 text-center space-y-4">
      <AlertTriangle className="h-12 w-12 mx-auto text-amber-600 dark:text-amber-400" />
      <div>
        <h3 className="font-semibold text-amber-900 dark:text-amber-100">
          El formulario está tardando en cargar
        </h3>
        <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
          Esto puede deberse a una conexión lenta. Por favor, verifica tu conexión a internet.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm font-medium transition-colors"
      >
        Reintentar carga
      </button>
    </div>
  );
}

interface CompanyFormClientProps {
  orgId: string;
  userId?: string;
  companyId?: string; // Para modo edición
}

export function CompanyFormClient({ orgId, userId, companyId }: CompanyFormClientProps) {
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  
  // Detectar si la carga está tardando demasiado
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTimedOut(true);
    }, LOAD_TIMEOUT_MS);
    
    return () => clearTimeout(timer);
  }, [retryKey]);
  
  const handleRetry = () => {
    setIsTimedOut(false);
    setRetryKey(k => k + 1);
  };
  
  // Si está en timeout, mostrar advertencia
  if (isTimedOut) {
    return <LoadTimeoutWarning onRetry={handleRetry} />;
  }
  
  // Renderizar el formulario dinámico con key para forzar re-render en retry
  return (
    <CompanyForm 
      key={retryKey}
      orgId={orgId} 
      {...(userId && { userId })}
      {...(companyId && { companyId })}
    />
  );
}

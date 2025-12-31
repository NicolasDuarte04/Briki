// /src/components/ui/OperationBlocker.tsx
'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useOperations, 
  selectIsPinOperationInProgress, 
  selectBlockingMessage 
} from '@/lib/ui/operationsStore';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface OperationBlockerProps {
  /** Clase adicional para el contenedor */
  className?: string;
  /** Mensaje personalizado (sobrescribe el del store) */
  customMessage?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * OperationBlocker - Modal bloqueante para operaciones en curso
 * 
 * Muestra un overlay semi-transparente con spinner cuando hay
 * operaciones de pin en curso. Bloquea interacciones del usuario
 * y previene navegación accidental.
 * 
 * Características:
 * - Modo claro/oscuro adaptativo
 * - Bloquea scroll mientras está activo
 * - Animación suave de entrada/salida
 * 
 * @example
 * // En un layout o página
 * <OperationBlocker />
 */
export function OperationBlocker({ 
  className,
  customMessage 
}: OperationBlockerProps) {
  const isInProgress = useOperations(selectIsPinOperationInProgress);
  const storeMessage = useOperations(selectBlockingMessage);
  
  const message = customMessage || storeMessage || 'Procesando...';
  
  // Bloquear scroll cuando está activo
  useEffect(() => {
    if (isInProgress) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isInProgress]);
  
  // No renderizar si no hay operaciones
  if (!isInProgress) {
    return null;
  }
  
  return (
    <div
      className={cn(
        // Posicionamiento
        'fixed inset-0 z-[9999]',
        // Overlay con blur
        'bg-background/60 backdrop-blur-sm',
        // Flexbox para centrar contenido
        'flex items-center justify-center',
        // Animación
        'animate-in fade-in duration-200',
        className
      )}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="operation-blocker-title"
      aria-describedby="operation-blocker-description"
    >
      {/* Contenedor del modal */}
      <div
        className={cn(
          // Tamaño y padding
          'px-8 py-6 max-w-sm w-full mx-4',
          // Estilo de card
          'bg-card border border-border rounded-lg shadow-lg',
          // Animación
          'animate-in zoom-in-95 duration-200'
        )}
      >
        {/* Spinner */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            {/* Círculo de fondo */}
            <div 
              className={cn(
                'w-16 h-16 rounded-full',
                'bg-primary/10',
                'dark:bg-primary/20'
              )}
            />
            {/* Spinner animado */}
            <Loader2 
              className={cn(
                'absolute inset-0 m-auto',
                'w-10 h-10',
                'text-primary',
                'animate-spin'
              )}
              aria-hidden="true"
            />
          </div>
        </div>
        
        {/* Mensaje */}
        <h2 
          id="operation-blocker-title"
          className="text-center text-lg font-semibold text-foreground"
        >
          {message}
        </h2>
        
        {/* Descripción */}
        <p 
          id="operation-blocker-description"
          className="text-center text-sm text-muted-foreground mt-2"
        >
          Por favor, espera mientras se completa la operación.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// HOOK ALTERNATIVO (para uso imperativo)
// ============================================================================

/**
 * Hook para mostrar/ocultar el bloqueador programáticamente
 * 
 * @example
 * const { showBlocker, hideBlocker } = useOperationBlocker();
 * 
 * async function handleOperation() {
 *   showBlocker('Guardando cambios...');
 *   await saveChanges();
 *   hideBlocker();
 * }
 */
export function useOperationBlocker() {
  const { 
    startPinOperation, 
    endPinOperation, 
    setBlockingMessage,
    clearAllOperations 
  } = useOperations();
  
  return {
    /**
     * Muestra el bloqueador con un mensaje personalizado
     * @param message - Mensaje a mostrar
     * @param operationId - ID único para la operación (default: 'manual')
     */
    showBlocker: (message: string, operationId = 'manual-operation') => {
      setBlockingMessage(message);
      startPinOperation(operationId);
    },
    
    /**
     * Oculta el bloqueador
     * @param operationId - ID de la operación a finalizar (default: 'manual')
     */
    hideBlocker: (operationId = 'manual-operation') => {
      endPinOperation(operationId);
    },
    
    /**
     * Limpia todas las operaciones (para recovery de errores)
     */
    clearAll: clearAllOperations,
  };
}


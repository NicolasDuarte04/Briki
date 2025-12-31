// /src/components/Workspace/PinButton.tsx
'use client';

import { useState, useEffect, useTransition, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PinnableEntityType } from '@/lib/data/workspace';
import { 
  useOperations, 
  selectIsPinOperationInProgress 
} from '@/lib/ui/operationsStore';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PinButtonProps {
  /** ID of the entity to pin/unpin */
  entityId: string;
  /** Type of entity ('case' | 'client' | 'policy') */
  entityType: PinnableEntityType;
  /** Initial pinned state */
  isPinned: boolean;
  /** Optional callback after toggle */
  onToggle?: (newState: boolean) => void;
  /** Optional className for additional styling */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Tiempo de debounce para agrupar refreshes (ms) */
const REFRESH_DEBOUNCE_MS = 600;

/** Tiempo adicional después del refresh para asegurar re-render completo (ms) */
const POST_REFRESH_DELAY_MS = 800;

// ============================================================================
// DEBOUNCED REFRESH SINGLETON WITH COMPLETION CALLBACK
// ============================================================================

// Singleton para debounce compartido entre todas las instancias de PinButton
let globalRefreshTimeout: NodeJS.Timeout | null = null;
let globalRefreshCallback: (() => void) | null = null;

// Callbacks para notificar cuando el refresh y re-render completen
let pendingCompletionCallbacks: Set<() => void> = new Set();

/**
 * Programa un refresh con debounce.
 * Si se llama múltiples veces dentro del período de debounce,
 * solo se ejecutará un refresh al final.
 * 
 * @param router - Next.js router
 * @param onComplete - Callback que se ejecuta DESPUÉS del refresh + re-render
 */
function scheduleRefresh(
  router: ReturnType<typeof useRouter>,
  onComplete?: () => void
) {
  // Agregar callback de completado a la lista
  if (onComplete) {
    pendingCompletionCallbacks.add(onComplete);
  }
  
  // Limpiar timeout anterior
  if (globalRefreshTimeout) {
    clearTimeout(globalRefreshTimeout);
  }
  
  // Guardar callback actualizado
  globalRefreshCallback = () => {
    console.log('[PinButton] Ejecutando refresh...');
    router.refresh();
    
    // Esperar tiempo adicional para que el re-render complete
    // LUEGO ejecutar todos los callbacks de completado
    setTimeout(() => {
      console.log(`[PinButton] Refresh + re-render completos. Notificando ${pendingCompletionCallbacks.size} callbacks.`);
      
      // Ejecutar todos los callbacks pendientes
      pendingCompletionCallbacks.forEach(callback => callback());
      
      // Limpiar
      pendingCompletionCallbacks.clear();
      globalRefreshTimeout = null;
      globalRefreshCallback = null;
    }, POST_REFRESH_DELAY_MS);
  };
  
  // Programar nuevo refresh
  globalRefreshTimeout = setTimeout(() => {
    if (globalRefreshCallback) {
      globalRefreshCallback();
    }
  }, REFRESH_DEBOUNCE_MS);
  
  console.log(`[PinButton] Refresh programado (debounce: ${REFRESH_DEBOUNCE_MS}ms, post-delay: ${POST_REFRESH_DELAY_MS}ms)`);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * PinButton - Reusable button for pinning/unpinning entities
 * 
 * Features:
 * - Optimistic updates for instant feedback
 * - Global operation store to prevent concurrent operations
 * - Debounced refresh to batch multiple pin operations
 * - Modal bloqueante permanece visible hasta que TODO el proceso complete
 * 
 * Visual behavior:
 * - When NOT pinned: Shows on hover only (opacity-0 → opacity-100 on group-hover)
 * - When pinned: Always visible with subtle background
 * - When blocked: Disabled appearance with tooltip
 * 
 * @example
 * <div className="group">
 *   <PinButton
 *     entityId={case.id}
 *     entityType="case"
 *     isPinned={false}
 *   />
 * </div>
 */
export function PinButton({
  entityId,
  entityType,
  isPinned: initialPinned,
  onToggle,
  className,
}: PinButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPinned, setIsPinned] = useState(initialPinned);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Global operations store
  const isGlobalOperationInProgress = useOperations(selectIsPinOperationInProgress);
  const { startPinOperation, endPinOperation } = useOperations();
  
  // Track if this specific button is processing
  const isProcessingRef = useRef(false);
  
  // Sync local state with server state after refresh
  useEffect(() => {
    setIsPinned(initialPinned);
  }, [initialPinned]);
  
  const handleClick = useCallback(async (e: React.MouseEvent) => {
    // Prevent click from propagating to parent Link
    e.preventDefault();
    e.stopPropagation();
    
    // Block if global operation is in progress (from another button)
    if (isGlobalOperationInProgress && !isProcessingRef.current) {
      console.log('[PinButton] Blocked - global operation in progress');
      return;
    }
    
    // Block if this button is already processing
    if (isProcessingRef.current) {
      console.log('[PinButton] Blocked - already processing');
      return;
    }
    
    // Clear previous errors
    setError(null);
    
    // Mark as processing (local + global)
    isProcessingRef.current = true;
    startPinOperation(entityId);
    
    // Start transition state (blocks hover effects)
    setIsTransitioning(true);
    
    // Optimistic update
    const previousState = isPinned;
    setIsPinned(!isPinned);
    
    try {
      const response = await fetch('/api/pins/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityId,
          entityType,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        // Revert optimistic update on error
        setIsPinned(previousState);
        setIsTransitioning(false);
        setError(data.error || 'Error al anclar');
        
        // End global operation
        isProcessingRef.current = false;
        endPinOperation(entityId);
        return;
      }
      
      // Sync with server state
      setIsPinned(data.isPinned);
      
      // Call optional callback
      onToggle?.(data.isPinned);
      
      // Schedule debounced refresh WITH completion callback
      // El modal permanecerá visible hasta que onComplete se ejecute
      startTransition(() => {
        scheduleRefresh(router, () => {
          // Este callback se ejecuta DESPUÉS del refresh + re-render
          console.log(`[PinButton] Operación completada para ${entityId}`);
          
          // Ahora sí terminar la operación global
          isProcessingRef.current = false;
          endPinOperation(entityId);
          
          // End transition
          setIsTransitioning(false);
        });
      });
      
    } catch (err) {
      // Revert optimistic update on network error
      setIsPinned(previousState);
      setIsTransitioning(false);
      setError('Error de conexión');
      console.error('[PinButton] Error:', err);
      
      // End global operation
      isProcessingRef.current = false;
      endPinOperation(entityId);
    }
  }, [
    entityId, 
    entityType, 
    isPinned, 
    isGlobalOperationInProgress,
    startPinOperation, 
    endPinOperation, 
    onToggle, 
    router
  ]);
  
  // Determine if button should be disabled
  const isBlocked = isGlobalOperationInProgress && !isProcessingRef.current;
  const isDisabled = isPending || isBlocked;
  
  // Determine button styles based on pinned state
  const buttonClasses = cn(
    // Base styles
    'h-8 w-8 p-0 transition-all duration-200',
    // Pinned state: always visible with consistent background
    isPinned && !isTransitioning && [
      'opacity-100',
      'bg-primary/15 hover:bg-primary/25',
      'dark:bg-primary/15 dark:hover:bg-primary/25',
      'border border-primary/20',
      'text-primary',
    ],
    // Not pinned + transitioning: force hidden (prevents hover ghost)
    !isPinned && isTransitioning && [
      'opacity-0',
    ],
    // Not pinned + not transitioning: hover only
    !isPinned && !isTransitioning && [
      'opacity-0 group-hover:opacity-100',
      'hover:bg-muted',
      'text-muted-foreground hover:text-foreground',
    ],
    // Loading state
    isPending && 'opacity-50 cursor-wait',
    // Blocked by global operation
    isBlocked && 'opacity-30 cursor-not-allowed',
    // Custom classes
    className
  );
  
  const iconClasses = cn(
    'h-4 w-4 transition-all duration-200',
    // Pinned: filled icon with slight scale
    isPinned && [
      'fill-primary stroke-primary',
      'scale-110',
    ],
    // Not pinned: outline icon
    !isPinned && [
      'fill-none stroke-current',
    ],
    // Loading: subtle animation
    isPending && 'animate-pulse scale-95'
  );
  
  // Tooltip text
  const getTitle = () => {
    if (error) return error;
    if (isBlocked) return 'Esperando proceso en curso...';
    return isPinned ? 'Desanclar' : 'Anclar al dashboard';
  };
  
  const ariaLabel = isPinned
    ? `Desanclar ${entityType}`
    : `Anclar ${entityType} al dashboard`;
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isDisabled}
      className={buttonClasses}
      title={getTitle()}
      aria-label={ariaLabel}
      aria-pressed={isPinned}
      aria-busy={isPending}
    >
      <Pin className={iconClasses} />
    </Button>
  );
}

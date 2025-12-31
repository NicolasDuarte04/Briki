// /src/lib/ui/operationsStore.ts
'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface OperationsState {
  /** IDs de entidades con operación de pin en curso */
  activePinOperations: Set<string>;
  
  /** Flag global: ¿hay alguna operación de pin en curso? */
  isPinOperationInProgress: boolean;
  
  /** Mensaje a mostrar en el bloqueador (traducible) */
  blockingMessage: string | null;
  
  /** Inicia una operación de pin para una entidad */
  startPinOperation: (entityId: string) => void;
  
  /** Finaliza una operación de pin para una entidad */
  endPinOperation: (entityId: string) => void;
  
  /** Limpia todas las operaciones (para recovery de errores) */
  clearAllOperations: () => void;
  
  /** Establece mensaje de bloqueo personalizado */
  setBlockingMessage: (message: string | null) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Timeout de seguridad: auto-clear operaciones después de 10s */
const OPERATION_TIMEOUT_MS = 10000;

/** Mapa de timeouts para auto-clear */
const operationTimeouts = new Map<string, NodeJS.Timeout>();

// ============================================================================
// STORE
// ============================================================================

export const useOperations = create<OperationsState>()(
  devtools(
    (set, get) => ({
      activePinOperations: new Set<string>(),
      isPinOperationInProgress: false,
      blockingMessage: null,
      
      startPinOperation: (entityId: string) => {
        // Limpiar timeout anterior si existe
        const existingTimeout = operationTimeouts.get(entityId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        
        // Establecer timeout de seguridad
        const timeout = setTimeout(() => {
          console.warn(`[operationsStore] Auto-clearing stale operation: ${entityId}`);
          get().endPinOperation(entityId);
        }, OPERATION_TIMEOUT_MS);
        
        operationTimeouts.set(entityId, timeout);
        
        set((state) => {
          const newOps = new Set(state.activePinOperations);
          newOps.add(entityId);
          
          return {
            activePinOperations: newOps,
            isPinOperationInProgress: true,
            blockingMessage: 'Esperando proceso en curso...',
          };
        });
        
        console.log(`[operationsStore] Started pin operation: ${entityId}`);
      },
      
      endPinOperation: (entityId: string) => {
        // Limpiar timeout
        const timeout = operationTimeouts.get(entityId);
        if (timeout) {
          clearTimeout(timeout);
          operationTimeouts.delete(entityId);
        }
        
        set((state) => {
          const newOps = new Set(state.activePinOperations);
          newOps.delete(entityId);
          
          const stillInProgress = newOps.size > 0;
          
          return {
            activePinOperations: newOps,
            isPinOperationInProgress: stillInProgress,
            blockingMessage: stillInProgress ? state.blockingMessage : null,
          };
        });
        
        console.log(`[operationsStore] Ended pin operation: ${entityId}`);
      },
      
      clearAllOperations: () => {
        // Limpiar todos los timeouts
        operationTimeouts.forEach((timeout) => clearTimeout(timeout));
        operationTimeouts.clear();
        
        set({
          activePinOperations: new Set<string>(),
          isPinOperationInProgress: false,
          blockingMessage: null,
        });
        
        console.log('[operationsStore] Cleared all operations');
      },
      
      setBlockingMessage: (message: string | null) => {
        set({ blockingMessage: message });
      },
    }),
    { name: 'operations-store' }
  )
);

// ============================================================================
// SELECTORS (para optimizar re-renders)
// ============================================================================

/** Selector: ¿Hay operación en curso? */
export const selectIsPinOperationInProgress = (state: OperationsState) => 
  state.isPinOperationInProgress;

/** Selector: Mensaje de bloqueo actual */
export const selectBlockingMessage = (state: OperationsState) => 
  state.blockingMessage;

/** Selector: ¿Una entidad específica está siendo procesada? */
export const selectIsEntityBeingProcessed = (entityId: string) => 
  (state: OperationsState) => state.activePinOperations.has(entityId);


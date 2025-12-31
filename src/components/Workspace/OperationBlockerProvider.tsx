// /src/components/Workspace/OperationBlockerProvider.tsx
'use client';

import { OperationBlocker } from '@/components/ui/OperationBlocker';

/**
 * OperationBlockerProvider - Client Component wrapper for OperationBlocker
 * 
 * Este componente permite incluir el OperationBlocker en Server Components
 * como layouts, ya que el OperationBlocker usa hooks de cliente (Zustand).
 * 
 * Se monta una vez en el layout de la aplicación y escucha el store global
 * para mostrar/ocultar el modal bloqueante.
 */
export function OperationBlockerProvider() {
  return <OperationBlocker />;
}

export default OperationBlockerProvider;


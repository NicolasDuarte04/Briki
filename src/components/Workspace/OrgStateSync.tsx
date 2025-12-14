"use client";

import { useEffect, useRef } from "react";
import { useUI } from "@/lib/ui/state";

interface OrgStateSyncProps {
  orgId: string;
}

/**
 * OrgStateSync - Componente vigilante para sincronizar el estado global con la organización activa.
 * 
 * Responsabilidades:
 * 1. Detecta cambios de organización comparando prop `orgId` con `currentOrgId` en Zustand.
 * 2. Al detectar un cambio, ejecuta `resetWorkspaceState()` para limpiar datos de la org anterior.
 * 3. Dispara recarga de datos (`fetchCases`, etc.) para la nueva organización.
 * 
 * Este componente garantiza que al cambiar de organización:
 * - No se mezclen datos de diferentes organizaciones.
 * - La UI se "blanquea" antes de cargar datos nuevos.
 * - Se mantiene la consistencia de estado unidireccional.
 */
export default function OrgStateSync({ orgId }: OrgStateSyncProps) {
  const { 
    currentOrgId, 
    setCurrentOrgId, 
    resetWorkspaceState,
    fetchCases 
  } = useUI();
  
  // Ref para evitar doble ejecución en StrictMode
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Primera carga: solo establecer el orgId sin resetear
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      if (currentOrgId !== orgId) {
        console.log('🏢 [OrgStateSync] Inicializando con org:', orgId);
        setCurrentOrgId(orgId);
        // Forzar recarga de datos para la org actual
        fetchCases(true);
      }
      return;
    }

    // Cambio de organización detectado
    if (currentOrgId && currentOrgId !== orgId) {
      console.log('🔄 [OrgStateSync] Cambio de organización detectado:', {
        anterior: currentOrgId,
        nueva: orgId
      });
      
      // 1. Resetear todo el estado del workspace
      resetWorkspaceState();
      
      // 2. Establecer la nueva organización
      setCurrentOrgId(orgId);
      
      // 3. Recargar datos para la nueva organización
      fetchCases(true);
    }
  }, [orgId, currentOrgId, setCurrentOrgId, resetWorkspaceState, fetchCases]);

  // Este componente no renderiza nada
  return null;
}

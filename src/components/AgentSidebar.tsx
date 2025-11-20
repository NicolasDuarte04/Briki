"use client";

import { useEffect } from "react";
import { useUI } from "@/lib/ui/state";
import SidebarChatPanel from "@/components/SidebarChatPanel";
import SidebarNav from "@/components/SidebarNav";

export default function AgentSidebar() {
  const { cases, chatPanelOpen, fetchCases } = useUI();
  
  // ✅ OPTIMIZACIÓN CRÍTICA: Cargar casos al iniciar la página (cada vez que se monta)
  // Esto asegura que siempre tengamos la lista más actualizada de cases
  useEffect(() => {
    // Cargar cases al montar el componente (inicio de página)
    // fetchCases() ya tiene lógica para evitar recargas duplicadas si ya está cargando
    fetchCases();
  }, []); // ✅ Solo ejecutar al montar (inicio de página)
  
  return chatPanelOpen ? <SidebarChatPanel cases={cases} /> : <SidebarNav />;
}

"use client";

import { useEffect } from "react";
import { useUI } from "@/lib/ui/state";
import SidebarChatPanel from "@/components/SidebarChatPanel";
import SidebarNav from "@/components/SidebarNav";

export default function AgentSidebar() {
  const { cases, chatPanelOpen, fetchCases, casesLoaded } = useUI();
  
  // Cargar casos cuando el componente se monta
  useEffect(() => {
    if (!casesLoaded) {
      fetchCases();
    }
  }, [fetchCases, casesLoaded]);
  
  return chatPanelOpen ? <SidebarChatPanel cases={cases} /> : <SidebarNav />;
}

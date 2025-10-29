"use client";

import { useEffect, useRef } from "react";
import { useUI } from "@/lib/ui/state";
import SidebarChatPanel from "@/components/SidebarChatPanel";
import SidebarNav from "@/components/SidebarNav";

export default function AgentSidebar() {
  const { cases, chatPanelOpen, fetchCases, casesLoaded } = useUI();
  const hasInitialized = useRef(false);
  
  // ✅ CORRECCIÓN CRÍTICA: Cargar casos solo una vez al montar
  useEffect(() => {
    if (!hasInitialized.current && !casesLoaded) {
      hasInitialized.current = true;
      fetchCases();
    }
  }, [casesLoaded]); // ✅ Solo casesLoaded como dependencia
  
  return chatPanelOpen ? <SidebarChatPanel cases={cases} /> : <SidebarNav />;
}

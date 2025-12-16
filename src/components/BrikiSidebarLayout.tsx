"use client";

import { Sidebar, SidebarBody } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/ui/state";
import AgentSidebar from "@/components/AgentSidebar";

export default function BrikiSidebarLayout({
  children,
  className,
  disableAutoCollapse = false,
}: {
  children: React.ReactNode;
  className?: string;
  disableAutoCollapse?: boolean;
}) {
  // 🔍 DEBUG: Log children recibidos
  console.log('🔍 [BrikiSidebarLayout] Renderizando con children:', {
    childrenType: typeof children,
    childrenIsArray: Array.isArray(children),
    childrenConstructor: children?.constructor?.name,
  });

  const { chatPanelOpen, sidebarOpen, setSidebarOpen } = useUI();
  
  // Keep sidebar open while chat panel is active
  useEffect(() => {
    if (chatPanelOpen) {
      setSidebarOpen(true);
    }
    // No forzar colapso automáticamente para permitir hover
  }, [chatPanelOpen, setSidebarOpen]);

  return (
    <div className={cn("flex min-h-screen w-full", className)}>
        <Sidebar open={sidebarOpen} setOpen={(value) => setSidebarOpen(typeof value === 'function' ? value(sidebarOpen) : value)} disableAutoCollapse={disableAutoCollapse || chatPanelOpen}>
          <SidebarBody className="border-r border-border/60 h-screen">
            <AgentSidebar />
          </SidebarBody>
        </Sidebar>
        <div
          id="main-content"
          className="flex-1 min-w-0 min-h-screen flex flex-col overflow-y-auto"
        >
          {children}
        </div>
      </div>
  );
}



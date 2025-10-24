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
  const { chatPanelOpen, sidebarOpen, setSidebarOpen } = useUI();
  
  // Keep sidebar open while chat panel is active
  useEffect(() => {
    if (chatPanelOpen) {
      setSidebarOpen(true);
    }
    // No forzar colapso automáticamente para permitir hover
  }, [chatPanelOpen, setSidebarOpen]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-background focus:text-foreground focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
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
    </>
  );
}



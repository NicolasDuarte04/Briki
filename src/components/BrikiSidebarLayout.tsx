"use client";

import { Sidebar, SidebarBody } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useUI } from "@/lib/ui/state";
import SidebarNav from "@/components/SidebarNav";
import SidebarChatPanel from "@/components/SidebarChatPanel";

/**
 * BrikiSidebarLayout
 * 
 * IMPORTANT: The sidebar rail should ONLY contain navigation components.
 * - SidebarNav: Main navigation and conversation list
 * - SidebarChatPanel: Expanded chat panel view
 * 
 * The main chat interface (BrikiChat) renders in the CENTER canvas area via HomeClient,
 * NOT in this sidebar. Do not add BrikiChat here.
 */
export default function BrikiSidebarLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { sidebarPanel } = useUI();
  
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-background focus:text-foreground focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <div className={cn("flex h-full w-full min-h-screen", className)}>
        <Sidebar open={open} setOpen={setOpen}>
          <SidebarBody className="border-r border-border/60 h-screen">
            <div className="h-full flex flex-col overflow-hidden">
              {sidebarPanel === 'chats' ? <SidebarChatPanel /> : <SidebarNav />}
            </div>
          </SidebarBody>
        </Sidebar>
        <div
          id="main-content"
          className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden"
        >
          {children}
        </div>
      </div>
    </>
  );
}



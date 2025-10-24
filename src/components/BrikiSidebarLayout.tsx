"use client";

import { Sidebar, SidebarBody } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useUI } from "@/lib/ui/state";

export default function BrikiSidebarLayout({
  sidebar,
  children,
  className,
  disableAutoCollapse = false,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  disableAutoCollapse?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { chatPanelOpen } = useUI();
  // Keep sidebar open while chat panel is active
  useEffect(() => {
    if (chatPanelOpen) {
      setOpen(true);
    }
  }, [chatPanelOpen]);
  return (
    <>
      <div className={cn("flex h-full w-full min-h-screen", className)}>
        <Sidebar open={open} setOpen={setOpen} disableAutoCollapse={disableAutoCollapse || chatPanelOpen}>
          <SidebarBody className="border-r border-border/60 h-screen">
            {sidebar}
          </SidebarBody>
        </Sidebar>
        <div
          id="main-content"
          className="flex-1 min-w-0 h-screen flex flex-col overflow-y-auto"
        >
          {children}
        </div>
      </div>
    </>
  );
}



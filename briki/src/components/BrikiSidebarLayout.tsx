"use client";

import { Sidebar, SidebarBody } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function BrikiSidebarLayout({
  sidebar,
  children,
  className,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("flex h-full w-full min-h-screen", className)}>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="border-r border-border/60 h-screen">
          {sidebar}
        </SidebarBody>
      </Sidebar>
      <div className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}



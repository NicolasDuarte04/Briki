"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationDropdown } from "./NotificationDropdown";
import { UserDropdown } from "./UserDropdown";
import { useUI } from "@/lib/ui/state";

/**
 * DashboardHeader component - Top navigation bar for the app shell.
 * 
 * Features:
 * - Mobile sidebar toggle button
 * - Theme toggle (light/dark/system)
 * - User dropdown menu (profile, settings, sign out)
 * 
 * Sticky positioned at the top of the main content area.
 * Designed to work alongside the BrikiSidebarLayout.
 */
export function DashboardHeader() {
  const { sidebarOpen, setSidebarOpen } = useUI();

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div
      role="toolbar"
      aria-label="Controles de la aplicación"
      className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6"
    >
      {/* Left section: Mobile menu toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9"
          onClick={handleToggleSidebar}
          aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Right section: Theme toggle + Notifications + User menu */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationDropdown />
        <UserDropdown />
      </div>
    </div>
  );
}


"use client";

import { SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useUI } from "@/lib/ui/state";
import { getWorkspaceLinks } from "@/config/navigation";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import type { Locale } from "@/lib/routes/workspace";
import { motion } from "framer-motion";

export default function SidebarNav() {
  // ✅ FASE 1: Eliminado setStep - ya no se necesita para navegación
  const { openChatPanel } = useUI();
  const { open, animate } = useSidebar();
  const pathname = usePathname();
  const locale = useLocale() as Locale;

  // ✅ FASE 1: Eliminado handleLogoClick - la navegación se maneja completamente por Next.js

  // Get locale-aware links with icons
  const links = getWorkspaceLinks(locale);

  // Check if a link is active based on the current pathname
  const isLinkActive = (link: typeof links[0]) => {
    // Remove locale prefix from pathname for comparison
    const pathWithoutLocale = pathname.replace(`/${locale}`, '');
    
    // Exact match for the matchPath
    if (pathWithoutLocale === link.matchPath) {
      return true;
    }
    
    // For nested routes, check if path starts with matchPath followed by '/'
    // This prevents false positives like /agent-tools matching /agent
    if (pathWithoutLocale.startsWith(link.matchPath + '/')) {
      return true;
    }
    
    return false;
  };

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <Link
          href="/landing"
          aria-label="Home"
          className="group flex items-center rounded-md py-2 pr-2 pl-0 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-white text-sm shadow-sm transition-colors group-hover:border-sidebar-ring group-focus-visible:border-sidebar-ring">
            <Image
              src="/brand/briki-logo-2.png"
              alt=""
              aria-hidden="true"
              width={24}
              height={24}
              className="h-6 w-6"
              priority
            />
          </span>
        </Link>
        
        {/* Chat button - positioned after logo */}
        <div className="mt-4 mb-4">
          <Button
            onClick={openChatPanel}
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm whitespace-pre inline-block !p-0 !m-0">
              <motion.span
                animate={{
                  display: animate ? (open ? "inline-block" : "none") : "inline-block",
                  opacity: animate ? (open ? 1 : 0) : 1,
                }}
              >
                Chat
              </motion.span>
            </span>
          </Button>
        </div>
        
        <div className="flex flex-col">
          {links.map((link) => (
            <SidebarLink 
              key={link.label} 
              link={link} 
              isActive={isLinkActive(link)}
            />
          ))}
        </div>
      </div>
      <div />
    </div>
  );
}



"use client";

import { 
  SidebarLink, 
  SidebarSection, 
  SidebarLinkWithSubmenu,
  useSidebar 
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useUI } from "@/lib/ui/state";
import { getWorkspaceSections, type NavItem } from "@/config/navigation";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import type { Locale } from "@/lib/routes/workspace";
import { motion } from "framer-motion";

export default function SidebarNav() {
  const { openChatPanel } = useUI();
  const { open, animate } = useSidebar();
  const pathname = usePathname();
  const locale = useLocale() as Locale;

  // Get locale-aware sections with items
  const sections = getWorkspaceSections(locale);

  /**
   * Check if a link is active based on the current pathname.
   * Works for both top-level links and subItems.
   */
  const isLinkActive = (matchPath: string) => {
    // Remove locale prefix from pathname for comparison
    const pathWithoutLocale = pathname.replace(`/${locale}`, '');
    
    // Exact match for the matchPath
    if (pathWithoutLocale === matchPath) {
      return true;
    }
    
    // For nested routes, check if path starts with matchPath followed by '/'
    if (pathWithoutLocale.startsWith(matchPath + '/')) {
      return true;
    }
    
    return false;
  };

  /**
   * Render a navigation item.
   * - If it has subItems, render SidebarLinkWithSubmenu
   * - Otherwise, render regular SidebarLink
   */
  const renderNavItem = (item: NavItem) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    
    if (hasSubItems && item.subItems) {
      return (
        <SidebarLinkWithSubmenu
          key={item.matchPath}
          link={{
            label: item.label,
            href: item.href,
            icon: item.icon,
            matchPath: item.matchPath,
            subItems: item.subItems,
          }}
          isActive={isLinkActive(item.matchPath)}
          isSubItemActive={isLinkActive}
          disabled={item.disabled ?? false}
        />
      );
    }
    
    return (
      <SidebarLink
        key={item.matchPath}
        link={{
          label: item.label,
          href: item.href,
          icon: item.icon,
          matchPath: item.matchPath,
        }}
        isActive={isLinkActive(item.matchPath)}
        disabled={item.disabled ?? false}
      />
    );
  };

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Logo */}
        <Link
          href="/landing"
          aria-label="Home"
          className="group flex items-center rounded-md py-2 pr-2 pl-0 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-background text-sm shadow-sm transition-colors group-hover:border-sidebar-ring group-focus-visible:border-sidebar-ring">
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
        
        {/* Chat button */}
        <div className="mt-4 mb-6">
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
        
        {/* Navigation Sections */}
        <nav className="flex flex-col" aria-label="Navegación principal">
          {sections.map((section) => (
            <SidebarSection key={section.id} title={section.title}>
              {section.items.map(renderNavItem)}
            </SidebarSection>
          ))}
        </nav>
      </div>
      
      {/* Footer spacer */}
      <div />
    </div>
  );
}

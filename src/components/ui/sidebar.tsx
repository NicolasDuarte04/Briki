"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import Link from "next/link";

interface Links {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  matchPath?: string; // For active state detection
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  disableAutoCollapse?: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
  disableAutoCollapse = false,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  disableAutoCollapse?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate, disableAutoCollapse }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
  disableAutoCollapse,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  disableAutoCollapse?: boolean;
}) => {
  return (
    <SidebarProvider
      {...(open !== undefined ? { open } : {})}
      {...(setOpen !== undefined ? { setOpen } : {})}
      {...(animate !== undefined ? { animate } : {})}
      {...(disableAutoCollapse !== undefined ? { disableAutoCollapse } : {})}
    >
      {children}
    </SidebarProvider>
  );
};

type SidebarBodyProps = {
  children: React.ReactNode;
  className?: string | undefined;
};

export const SidebarBody = ({
  children,
  className,
}: SidebarBodyProps) => {
  return (
    <>
      <DesktopSidebar className={className}>
        {children}
      </DesktopSidebar>
      <MobileSidebar className={className}>{children}</MobileSidebar>
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
}: {
  className?: string | undefined;
  children: React.ReactNode;
}) => {
  const { open, setOpen, animate, disableAutoCollapse } = useSidebar();
  return (
    <>
      <div 
        className={cn(
          "h-full hidden md:flex md:flex-col bg-sidebar border-r border-sidebar-border shrink-0 transition-all duration-200 ease-in-out",
          open ? "w-[280px]" : "w-[72px]",
          className
        )}
        onMouseEnter={() => {
          if (!disableAutoCollapse) {
            setOpen(true);
          }
        }}
        onMouseLeave={() => {
          if (!disableAutoCollapse) {
            setOpen(false);
          }
        }}
      >
        <div className="px-4 py-4 h-full">
          <div className="h-full w-full">
            <motion.div
              animate={{
                width: animate ? (open ? "100%" : "100%") : "100%",
              }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="h-full w-full">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export const MobileSidebar = ({
  className,
  children,
}: {
  className?: string | undefined;
  children: React.ReactNode;
}) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-sidebar border-b border-sidebar-border w-full"
        )}
      >
        <div className="flex justify-end z-20 w-full">
          <button
            onClick={() => setOpen(!open)}
            aria-label="Open sidebar menu"
            className="p-2 -m-2"
          >
            <IconMenu2 className="text-neutral-800" aria-hidden="true" />
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <div className={cn(
              "fixed h-full w-full inset-0 bg-sidebar p-10 z-[100] flex flex-col justify-between",
              className
            )}>
              <motion.div
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-100%", opacity: 0 }}
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
              >
                <div className="h-full w-full flex flex-col justify-between">
                  <button
                    className="absolute right-10 top-10 z-50 text-neutral-800 p-2 -m-2"
                    onClick={() => setOpen(!open)}
                    aria-label="Close sidebar menu"
                  >
                    <IconX aria-hidden="true" />
                  </button>
                  {children}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  isActive,
  disabled,
  ...props
}: {
  link: Links;
  className?: string;
  isActive?: boolean;
  disabled?: boolean;
}) => {
  const { open, animate } = useSidebar();
  
  if (disabled) {
    return (
      <span
        className={cn(
          "flex items-center justify-start gap-2 group/sidebar py-2 px-2 rounded-md",
          "text-muted-foreground/50 cursor-not-allowed",
          className
        )}
        aria-disabled="true"
      >
        {link.icon ? React.createElement(link.icon, { className: "h-4 w-4" }) : null}
        <span className="text-sm whitespace-pre inline-block !p-0 !m-0">
          <motion.span
            animate={{
              display: animate ? (open ? "inline-block" : "none") : "inline-block",
              opacity: animate ? (open ? 1 : 0) : 1,
            }}
          >
            {link.label}
          </motion.span>
        </span>
      </span>
    );
  }
  
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 px-2 rounded-md",
        "text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        "transition-colors duration-150",
        isActive && "bg-sidebar-accent font-medium",
        className
      )}
      aria-current={isActive ? "page" : undefined}
      aria-label={link.label}
      {...props}
    >
      {link.icon ? React.createElement(link.icon, { className: "h-4 w-4" }) : null}

      <span className="text-sm whitespace-pre inline-block !p-0 !m-0">
        <motion.span
          animate={{
            display: animate ? (open ? "inline-block" : "none") : "inline-block",
            opacity: animate ? (open ? 1 : 0) : 1,
          }}
        >
          {link.label}
        </motion.span>
      </span>
    </Link>
  );
};

// =============================================================================
// SIDEBAR SECTION - Header de sección con título
// =============================================================================

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const SidebarSection = ({
  title,
  children,
  className,
}: SidebarSectionProps) => {
  const { open, animate } = useSidebar();
  
  return (
    <div className={cn("mb-4", className)}>
      {/* Header de sección */}
      <div className="mb-2 px-2">
        <motion.h3
          animate={{
            display: animate ? (open ? "block" : "none") : "block",
            opacity: animate ? (open ? 1 : 0) : 1,
          }}
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {title}
        </motion.h3>
        {/* Icono de puntos cuando está colapsado */}
        <motion.div
          animate={{
            display: animate ? (open ? "none" : "flex") : "none",
            opacity: animate ? (open ? 0 : 1) : 0,
          }}
          className="justify-center"
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </div>
      {/* Items de la sección */}
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </div>
  );
};

// =============================================================================
// SIDEBAR LINK WITH SUBMENU - Link con submenú desplegable
// =============================================================================

interface SubItem {
  label: string;
  href: string;
  matchPath: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SidebarLinkWithSubmenuProps {
  link: Links & { subItems?: SubItem[] };
  className?: string;
  isActive?: boolean;
  isSubItemActive?: (matchPath: string) => boolean;
  disabled?: boolean;
}

export const SidebarLinkWithSubmenu = ({
  link,
  className,
  isActive,
  isSubItemActive,
  disabled,
}: SidebarLinkWithSubmenuProps) => {
  const { open, animate } = useSidebar();
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [submenuHeight, setSubmenuHeight] = useState(0);

  // Calcular altura del submenú cuando se abre
  useEffect(() => {
    if (isSubmenuOpen && submenuRef.current) {
      setSubmenuHeight(submenuRef.current.scrollHeight);
    }
  }, [isSubmenuOpen]);

  // Auto-abrir si un subítem está activo
  useEffect(() => {
    if (link.subItems && isSubItemActive) {
      const hasActiveSubItem = link.subItems.some(sub => isSubItemActive(sub.matchPath));
      if (hasActiveSubItem) {
        setIsSubmenuOpen(true);
      }
    }
  }, [link.subItems, isSubItemActive]);

  // Cerrar submenú cuando el sidebar se colapsa
  useEffect(() => {
    if (!open) {
      setIsSubmenuOpen(false);
    }
  }, [open]);

  const hasSubItems = link.subItems && link.subItems.length > 0;
  const anySubItemActive = hasSubItems && isSubItemActive && link.subItems
    ? link.subItems.some(sub => isSubItemActive(sub.matchPath)) 
    : false;

  if (disabled) {
    return (
      <span
        className={cn(
          "flex items-center justify-start gap-2 py-2 px-2 rounded-md",
          "text-muted-foreground/50 cursor-not-allowed",
          className
        )}
        aria-disabled="true"
      >
        {link.icon ? React.createElement(link.icon, { className: "h-4 w-4" }) : null}
        <span className="text-sm whitespace-pre inline-block !p-0 !m-0">
          <motion.span
            animate={{
              display: animate ? (open ? "inline-block" : "none") : "inline-block",
              opacity: animate ? (open ? 1 : 0) : 1,
            }}
          >
            {link.label}
          </motion.span>
        </span>
      </span>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Link principal con botón de toggle */}
      <div className="flex items-center">
        {/* Link principal - navega al href */}
        <Link
          href={link.href}
          className={cn(
            "flex-1 flex items-center justify-start gap-2 py-2 px-2 rounded-l-md",
            "text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            "transition-colors duration-150",
            (isActive || anySubItemActive) && "bg-sidebar-accent font-medium",
            className
          )}
          aria-current={isActive ? "page" : undefined}
        >
          {link.icon ? React.createElement(link.icon, { className: "h-4 w-4" }) : null}
          <span className="text-sm whitespace-pre inline-block !p-0 !m-0">
            <motion.span
              animate={{
                display: animate ? (open ? "inline-block" : "none") : "inline-block",
                opacity: animate ? (open ? 1 : 0) : 1,
              }}
            >
              {link.label}
            </motion.span>
          </span>
        </Link>
        
        {/* Botón de toggle del submenú (solo visible cuando sidebar está abierto) */}
        {hasSubItems && (
          <motion.button
            animate={{
              display: animate ? (open ? "flex" : "none") : "flex",
              opacity: animate ? (open ? 1 : 0) : 1,
            }}
            onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
            className={cn(
              "flex items-center justify-center p-2 rounded-r-md",
              "text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              "transition-colors duration-150",
              (isActive || anySubItemActive) && "bg-sidebar-accent"
            )}
            aria-expanded={isSubmenuOpen}
            aria-label={isSubmenuOpen ? "Cerrar submenú" : "Abrir submenú"}
          >
            <ChevronDown 
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isSubmenuOpen && "rotate-180"
              )} 
            />
          </motion.button>
        )}
      </div>

      {/* Submenú desplegable */}
      {hasSubItems && open && (
        <div
          className="overflow-hidden transition-all duration-200 ease-in-out"
          style={{ height: isSubmenuOpen ? submenuHeight : 0 }}
        >
          <div ref={submenuRef} className="pl-6 pt-1 space-y-1">
            {link.subItems!.map((subItem) => {
              const subIsActive = isSubItemActive ? isSubItemActive(subItem.matchPath) : false;
              return (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  className={cn(
                    "flex items-center gap-2 py-1.5 px-2 rounded-md text-sm",
                    "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    "transition-colors duration-150",
                    subIsActive && "bg-sidebar-accent/60 text-sidebar-foreground font-medium"
                  )}
                  aria-current={subIsActive ? "page" : undefined}
                >
                  {subItem.icon ? React.createElement(subItem.icon, { className: "h-3.5 w-3.5" }) : null}
                  <span>{subItem.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

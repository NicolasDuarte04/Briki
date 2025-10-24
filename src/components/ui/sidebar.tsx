"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconMenu2, IconX } from "@tabler/icons-react";
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
  ...props
}: {
  link: Links;
  className?: string;
  isActive?: boolean;
}) => {
  const { open, animate } = useSidebar();
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

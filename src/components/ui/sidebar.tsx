"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { useUI } from "@/lib/ui/state";

interface Links {
  label: string;
  href: string;
  icon?: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
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
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider
      {...(open !== undefined ? { open } : {})}
      {...(setOpen !== undefined ? { setOpen } : {})}
      {...(animate !== undefined ? { animate } : {})}
    >
      {children}
    </SidebarProvider>
  );
};

type SidebarBodyProps = Omit<React.ComponentProps<typeof motion.div>, "children"> & {
  children: React.ReactNode;
};

export const SidebarBody = ({
  children,
  className,
  ...rest
}: SidebarBodyProps) => {
  return (
    <>
      <DesktopSidebar className={className} {...rest}>
        {children}
      </DesktopSidebar>
      <MobileSidebar className={className}>{children}</MobileSidebar>
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open: hoverOpen, setOpen, animate } = useSidebar();
  const { sidebarPinned } = useUI();
  const isOpen = sidebarPinned || hoverOpen;
  
  return (
    <>
      <motion.div
        className={cn(
          "h-full px-4 py-4 hidden md:flex md:flex-col bg-sidebar border-r border-sidebar-border w-[280px] shrink-0 overflow-hidden",
          className
        )}
        animate={{
          width: animate ? (isOpen ? "280px" : "72px") : "280px",
        }}
        onMouseEnter={() => !sidebarPinned && setOpen(true)}
        onMouseLeave={() => !sidebarPinned && setOpen(false)}
        aria-expanded={isOpen}
        {...props}
      >
        {children}
      </motion.div>
    </>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-sidebar border-b border-sidebar-border w-full"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <button
            onClick={() => setOpen(!open)}
            aria-label="Open sidebar menu"
            className="p-2 -m-2"
          >
            <IconMenu2 className="text-neutral-800" />
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-sidebar p-10 z-[100] flex flex-col justify-between",
                className
              )}
            >
              <button
                className="absolute right-10 top-10 z-50 text-neutral-800 p-2 -m-2"
                onClick={() => setOpen(!open)}
                aria-label="Close sidebar menu"
              >
                <IconX />
              </button>
              {children}
            </motion.div>
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
  const { open: hoverOpen, animate } = useSidebar();
  const { sidebarPinned } = useUI();
  const isOpen = sidebarPinned || hoverOpen;
  
  return (
    <a
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 px-2 rounded-md",
        "text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        "transition-colors duration-150",
        isActive && "bg-sidebar-accent font-medium",
        className
      )}
      aria-current={isActive ? "page" : undefined}
      {...props}
    >
      {link.icon ? link.icon : null}

      <motion.span
        animate={{
          display: animate ? (isOpen ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (isOpen ? 1 : 0) : 1,
        }}
        className="text-sm whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </a>
  );
};

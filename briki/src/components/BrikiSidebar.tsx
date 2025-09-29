"use client";

import React from "react";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
} from "@/components/ui/sidebar";
import { IconLogout } from "@tabler/icons-react";

export default function BrikiSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  const navLinks = [
    { label: "Saved Analyses", href: "#" },
    { label: "Cases", href: "#" },
    { label: "Playbooks", href: "#" },
    { label: "Integrations", href: "#" },
    { label: "Settings", href: "#" },
  ];

  return (
    <div className="flex h-screen w-full">
      <Sidebar open={open} setOpen={setOpen} animate>
        <SidebarBody>
          <div className="flex h-full flex-col gap-2">
            <a href="/" className="block py-2 select-none">
              <span className="text-xl font-semibold text-briki-gradient leading-none">
                Briki
              </span>
            </a>

            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <SidebarLink 
                  key={link.label} 
                  link={link} 
                  isActive={link.label === "Saved Analyses"}
                />
              ))}
            </nav>

            <div className="mt-auto pt-2">
              <SidebarLink link={{ label: "Logout", href: "#" }} />
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}



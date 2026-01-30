"use client";

import React from "react";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
} from "@/components/ui/sidebar";
import { IconLogout } from "@tabler/icons-react";
import Link from "next/link";
import { workspaceLinks } from "@/config/navigation";
import { useLocale } from "next-intl";

export default function BrikiSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const locale = useLocale();

  const navLinks = workspaceLinks;

  return (
    <div className="flex h-screen w-full">
      <Sidebar open={open} setOpen={setOpen} animate>
        <SidebarBody>
          <div className="flex h-full flex-col gap-2">
            <Link href={`/${locale}/landing`} className="block py-2 select-none">
              <span className="text-xl font-semibold text-briki-gradient leading-none">
                Briki
              </span>
            </Link>

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



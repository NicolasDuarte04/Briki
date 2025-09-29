"use client";

import { SidebarLink } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

const links = [
  { label: "Saved Analyses", href: "#" },
  { label: "Cases", href: "#" },
  { label: "Playbooks", href: "#" },
  { label: "Integrations", href: "#" },
  { label: "Settings", href: "#" },
];

export default function SidebarNav() {
  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <Link
          href="/"
          aria-label="Home"
          className="group flex items-center rounded-md py-2 pr-2 pl-0 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-white text-sm shadow-sm transition-colors group-hover:border-sidebar-ring group-focus-visible:border-sidebar-ring dark:bg-neutral-900">
            <Image
              src="/brand/briki-logo-2.png"
              alt="Briki logo"
              width={24}
              height={24}
              className="h-6 w-6"
              priority
            />
          </span>
        </Link>
        <div className="mt-4 flex flex-col">
          {links.map((link) => (
            <SidebarLink key={link.label} link={link} />
          ))}
          <SidebarLink link={{ label: "Logout", href: "#" }} />
        </div>
      </div>
      <div />
    </div>
  );
}



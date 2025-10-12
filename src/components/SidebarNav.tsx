"use client";

import { SidebarLink } from "@/components/ui/sidebar";
import Image from "next/image";
import Link from "next/link";
import { useUI } from "@/lib/ui/state";
import { workspaceLinks } from "@/config/navigation";

const links = workspaceLinks;

export default function SidebarNav() {
  const { setStep } = useUI();

  const handleLogoClick = () => {
    setStep("landing");
  };

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <Link
          href="/"
          onClick={handleLogoClick}
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
        <div className="mt-4 flex flex-col">
          {links.map((link) => (
            <SidebarLink key={link.label} link={link} />
          ))}
        </div>
      </div>
      <div />
    </div>
  );
}



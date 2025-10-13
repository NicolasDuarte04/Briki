"use client";

import { SidebarLink } from "@/components/ui/sidebar";
import Image from "next/image";
import Link from "next/link";
import { useUI } from "@/lib/ui/state";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

const links = [
  { label: "Saved Analyses", href: "#" },
  { label: "Cases", href: "#" },
  { label: "Playbooks", href: "#" },
  { label: "Integrations", href: "#" },
  { label: "Settings", href: "#" },
];

export default function SidebarNav() {
  const { setStep, openSidebarPanel, sidebarPanel } = useUI();

  const handleLogoClick = () => {
    setStep("landing");
  };

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex flex-col h-full overflow-hidden">
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

        {/* Chat Panel Trigger */}
        <button
          onClick={() => openSidebarPanel('chats')}
          className={cn(
            "mt-4 flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            sidebarPanel === 'chats'
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <ChatBubbleLeftRightIcon className="h-5 w-5 shrink-0" />
          <span>Chat</span>
        </button>

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



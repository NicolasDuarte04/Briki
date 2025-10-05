"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
} from "@/components/ui/resizable-navbar";

const navItems = [
  { name: "Features", link: "#features" },
  { name: "Pricing", link: "#pricing" },
  { name: "Contact", link: "#contact" },
];

const BrikiLogo = () => (
  <a href="#" className="relative z-20 flex items-center rounded-md focus-visible:outline-none focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent">
    <Image
      src="/brand/briki-logo-2.png"
      alt="Briki Logo"
      width={20}
      height={20}
      className="w-5 h-5 relative z-10"
      priority
    />
    <span className="text-lg font-bold ml-1 relative z-0 text-white">
      Briki
    </span>
  </a>
);

export default function BrikiLandingNavbar() {
  const t = useTranslations("nav");
  const [isOpen, setIsOpen] = useState(false);
  const [activeHash, setActiveHash] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setActiveHash(window.location.hash || "");
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  const promptSupabaseLogin = () => {
    console.warn("Supabase login flow not yet wired. Replace this handler with Supabase auth.");
  };

  return (
    <Navbar className="min-h-fit bg-transparent border-0 navbar-transparent">
      {/* Desktop Navigation */}
      <NavBody className="h-full px-4 md:px-6 gap-6">
        <div className="relative z-50 flex w-full items-center justify-between">
          <BrikiLogo />
          <NavItems items={navItems} />
          <div className="relative z-50 flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-4 text-sm"
              onClick={promptSupabaseLogin}
            >
              {t("login")}
            </Button>
          </div>
        </div>
      </NavBody>

      {/* Mobile Navigation */}
      <MobileNav>
        <MobileNavHeader>
          <BrikiLogo />
          <MobileNavToggle isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />
        </MobileNavHeader>

        <MobileNavMenu isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="flex w-full flex-col items-start gap-4">
            {navItems.map((item, idx) => (
              <a
                key={idx}
                href={item.link}
                className="w-full rounded-md px-4 py-2 text-lg text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
                onClick={() => {
                  setIsOpen(false);
                  setActiveHash(item.link);
                }}
                aria-current={activeHash === item.link ? "page" : undefined}
              >
                {item.name}
              </a>
            ))}
            <div className="flex w-full flex-col gap-2 pt-4">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-lg"
                onClick={promptSupabaseLogin}
              >
                {t("login")}
              </Button>
            </div>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}

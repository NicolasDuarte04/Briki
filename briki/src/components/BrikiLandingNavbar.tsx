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
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { name: "Features", link: "#features" },
  { name: "Pricing", link: "#pricing" },
  { name: "Contact", link: "#contact" },
];

const BrikiLogo = () => (
  <a href="#" className="relative z-20 flex items-center rounded-md focus-visible:outline-none focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent">
    <Image
      src="/brand/briki-logo-2.png"
      alt=""
      aria-hidden="true"
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
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    console.log("[Briki Nav] useEffect triggered.");
    const supabase = createBrowserSupabase();
    
    const checkUser = async () => {
      console.log("[Briki Nav] Checking user session...");
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("[Briki Nav] Error fetching user:", error);
      }
      console.log("[Briki Nav] User object received:", data.user);
      setUser(data.user);
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[Briki Nav] Auth state changed:", event);
      setUser(session?.user ?? null);
    });

    if (typeof window === "undefined") return;
    const update = () => setActiveHash(window.location.hash || "");
    update();
    window.addEventListener("hashchange", update);
    
    return () => {
      window.removeEventListener("hashchange", update);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const promptSupabaseLogin = () => {
    window.location.href = '/login';
  };

  const goToApp = () => {
    window.location.href = '/profile'; // Or wherever your main app page is
  };

  return (
    <Navbar className="min-h-fit bg-transparent border-0 navbar-transparent fixed top-0 left-0 right-0 z-50">
      {/* Desktop Navigation */}
      <NavBody className="h-full px-4 md:px-6 gap-6">
        <div className="relative z-50 flex w-full items-center justify-between">
          <BrikiLogo />
          <NavItems items={navItems} />
          <div className="relative z-50 flex items-center">
            {user ? (
              <Button 
                variant="default" 
                size="sm" 
                className="h-8 px-4 text-sm"
                onClick={goToApp}
              >
                Go to App
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-4 text-sm"
                onClick={promptSupabaseLogin}
              >
                {t("login")}
              </Button>
            )}
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
              {user ? (
                <Button 
                  variant="default" 
                  className="w-full justify-start text-lg"
                  onClick={goToApp}
                >
                  Go to App
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-lg"
                  onClick={promptSupabaseLogin}
                >
                  {t("login")}
                </Button>
              )}
            </div>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}

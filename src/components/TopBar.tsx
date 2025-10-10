import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { createServerSupabase } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { TopBarClient } from "./TopBarClient";

interface TopBarProps {
  className?: string;
  locale: string;
}

export async function TopBar({ className, locale }: TopBarProps) {
  const tTopbar = await getTranslations("topbar");
  
  // Check authentication status on the server
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Get user display info from profile if available
  let userDisplayName = user?.email || "";
  
  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();
    
    if (profileData?.name) {
      userDisplayName = profileData.name;
    }
  }

  const userInitials = userDisplayName
    ? userDisplayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header
      data-print="hide"
      className={cn(
        "w-full min-h-fit border-b border-black/5 backdrop-blur supports-[backdrop-filter]:bg-transparent",
        "flex items-center px-4 sm:px-6",
        className
      )}
    >
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label={tTopbar("brandAria")}
            title={tTopbar("brandTitle")}
            className="group flex items-center gap-3 rounded-md px-1 py-1 text-base font-semibold tracking-tight text-foreground transition hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold leading-none"
            >
              B
            </span>
            <span>{tTopbar("brandName")}</span>
          </Link>
        </div>
        <TopBarClient 
          locale={locale}
          isAuthenticated={isAuthenticated}
          userInitials={userInitials}
        />
      </div>
    </header>
  );
}

export default TopBar;
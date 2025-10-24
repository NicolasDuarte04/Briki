"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopBarClientProps {
  locale: string;
  isAuthenticated: boolean;
  userInitials: string;
}

export function TopBarClient({ locale, isAuthenticated, userInitials }: TopBarClientProps) {
  const tAuthNav = useTranslations("auth.nav");
  const tTopbar = useTranslations("topbar");

  return (
    <div className="flex items-center gap-3">
      {isAuthenticated ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label={tTopbar("accountMenuAria")}
              title={tTopbar("accountMenuTitle")}
              data-print="hide"
              aria-haspopup="menu"
            >
              <Avatar className="size-9">
                <AvatarFallback className="bg-accent text-sm font-semibold text-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="sr-only">{tTopbar("accountMenuAria")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/profile`} className="w-full">
                {tAuthNav("profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async (e) => {
                e.preventDefault();
                try {
                  // Import dynamically to avoid bundling server action in client
                  const { signOut } = await import("@/app/[locale]/(auth)/actions");
                  await signOut();
                  // The redirect will happen in the server action
                } catch (error) {
                  console.error('Sign out error:', error);
                  // Force a page reload as fallback
                  window.location.href = '/';
                }
              }}
            >
              {tAuthNav("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          asChild
          className="text-sm font-semibold"
          data-print="hide"
        >
          <Link href={`/${locale}/login`} aria-label={tAuthNav("login")}>
            {tAuthNav("login")}
          </Link>
        </Button>
      )}
    </div>
  );
}

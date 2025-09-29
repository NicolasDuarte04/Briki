"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppLocale } from "@/components/I18nProvider";

export function TopBar({ className }: { className?: string }) {
  const { locale, toggleLocale } = useAppLocale();
  const tLocale = useTranslations("nav.locale");
  const tTopbar = useTranslations("topbar");
  const nextLanguageLabel = locale === "en" ? tLocale("spanish") : tLocale("english");

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
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleLocale}
            aria-label={tLocale("toggle", { language: nextLanguageLabel })}
            title={tLocale("toggle", { language: nextLanguageLabel })}
            className="h-8 px-2"
            data-print="hide"
          >
            {locale.toUpperCase()}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={tTopbar("accountMenuAria")}
            title={tTopbar("accountMenuTitle")}
            data-print="hide"
          >
            <Avatar className="size-9">
              <AvatarFallback className="bg-accent text-sm font-semibold text-foreground">
                {tTopbar("accountInitials")}
              </AvatarFallback>
            </Avatar>
            <span className="sr-only">{tTopbar("accountMenuAria")}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export default TopBar;



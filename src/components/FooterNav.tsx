"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function FooterNav({ className, fullBleed = false }: { className?: string; fullBleed?: boolean }) {
  const currentYear = new Date().getFullYear();
  const t = useTranslations("footer");

  const containerClasses = fullBleed
    ? "w-full px-4 sm:px-6 py-6"
    : "mx-auto max-w-7xl px-4 py-6";

  return (
    <nav
      role="navigation"
      aria-label="Footer navigation"
      className={cn(
        "w-full border-t bg-white px-safe",
        fullBleed ? undefined : "rounded-t-lg",
        className
      )}
    >
      <div className={cn(containerClasses)}>
        <div className="flex items-start justify-between w-full font-inter">
          {/* Left: Brand */}
          <div className="flex items-start">
            <span className="text-briki-gradient font-bold text-xl">Briki</span>
          </div>

          {/* Center: Copyright */}
          <div className="flex items-start">
            <span className="text-base text-muted-foreground">
              © {currentYear} Briki. {t("rights")}
            </span>
          </div>

          {/* Right: Contact Links - Stacked */}
          <div className="flex flex-col items-start gap-1">
            <a
              href="https://www.linkedin.com/company/brikiapp/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-base text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              {t("linkedin")}
            </a>
            <a
              href="mailto:contact@brikiapp.com"
              className="text-base text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              contact@brikiapp.com
            </a>
            <a
              href="mailto:talent@brikiapp.com"
              className="text-base text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              talent@brikiapp.com
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

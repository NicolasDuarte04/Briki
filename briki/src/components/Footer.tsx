"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { CircleQuestionMark } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type FooterProps = {
  className?: string;
};

export function Footer({ className }: FooterProps) {
  const t = useTranslations("footer"); 
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn("w-full border-t bg-background", className)}>
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:flex-wrap md:items-center md:justify-between md:text-left">
          {/* Brand and Copyright */}
          <div className="flex flex-col items-center gap-2 md:items-start md:text-left">
            <div className="flex items-center gap-2">
              <span
                className="text-lg font-semibold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent select-none"
                aria-label="Briki brand"
              >
                Briki
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center"
                    aria-label="Learn more about Briki"
                  >
                    <CircleQuestionMark className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Briki helps streamline insurance processes for early-stage teams</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm text-muted-foreground">
              © {currentYear} Briki. {t("rights")}
            </span>
          </div>

          {/* Contact Information - Stacked */}
          <div className="flex flex-col items-center gap-4 text-sm md:items-end md:text-right">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
              <svg 
                className="w-4 h-4" 
                fill="currentColor" 
                viewBox="0 0 24 24" 
                aria-hidden="true"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <a
                href="https://www.linkedin.com/company/brikiapp/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open Briki LinkedIn page"
                className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t("linkedin")}
              </a>
            </div>
            
            <div className="text-muted-foreground">
              <span className="font-medium">Get in contact:</span>{" "}
              <a
                href="mailto:contact@brikiapp.com"
                aria-label="Email contact at Briki"
                className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                contact@brikiapp.com
              </a>
            </div>
            
            <div className="text-muted-foreground">
              <span className="font-medium">Work with us:</span>{" "}
              <a
                href="mailto:talent@brikiapp.com"
                aria-label="Email talent at Briki"
                className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                talent@brikiapp.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

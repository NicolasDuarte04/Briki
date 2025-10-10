"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface HotkeysGuideProps {
  className?: string;
  triggerClassName?: string;
}

export function HotkeysGuide({ className, triggerClassName }: HotkeysGuideProps) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const descriptionId = useId();
  const t = useTranslations("hotkeys");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleHotkeysEvent() {
      setOpen(true);
    }

    window.addEventListener("briki:hotkeys", handleHotkeysEvent);
    return () => window.removeEventListener("briki:hotkeys", handleHotkeysEvent);
  }, []);

  useEffect(() => {
    if (!open) return;
    const content = contentRef.current;
    if (!content) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusTimeout = window.setTimeout(() => {
      content.focus({ preventScroll: true });
    }, 0);

    return () => {
      window.clearTimeout(focusTimeout);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const items: Array<{ label: string; combo: string }> = [
    {
      label: t("items.openGuide.label"),
      combo: t("items.openGuide.combo"),
    },
    {
      label: t("items.commandPalette.label"),
      combo: t("items.commandPalette.combo"),
    },
    {
      label: t("items.togglePanel.label"),
      combo: t("items.togglePanel.combo"),
    },
    {
      label: t("items.switchStep.label"),
      combo: t("items.switchStep.combo"),
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={contentId}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground transition-all",
            "hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            triggerClassName,
          )}
        >
          <span className="sr-only">{t("triggerLabel")}</span>
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        id={contentId}
        aria-labelledby={`${contentId}-title`}
        align="end"
        sideOffset={12}
        tabIndex={-1}
        role="dialog"
        aria-describedby={descriptionId}
        data-hotkeys-suspend=""
        className={cn("max-w-sm", className)}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p id={`${contentId}-title`} className="text-sm font-medium text-foreground">
                {t("title")}
              </p>
              <p id={descriptionId} className="text-xs text-muted-foreground">
                {t("guideDescription")}
              </p>
            </div>
            <PopoverClose
              className={cn(
                "flex size-7 items-center justify-center rounded-full border border-transparent text-muted-foreground transition",
                "hover:border-border hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              aria-label={t("closeLabel")}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </PopoverClose>
          </div>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.combo} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-mono text-xs text-foreground">{item.combo}</span>
              </li>
            ))}
            <li className="text-xs text-muted-foreground">{t("ignored")}</li>
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default HotkeysGuide;


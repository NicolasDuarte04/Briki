"use client";

import { useState, forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useUI } from "@/lib/ui/state";
import { useTranslations } from "next-intl";

export interface BrikiLandingChatRef {
  focusChat: () => void;
  getValue: () => string;
  showHelper: () => void;
}

const BrikiLandingChat = forwardRef<BrikiLandingChatRef, { className?: string }>(({ className }, ref) => {
  const t = useTranslations();
  const { setStep, setBrief } = useUI();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showHelper, setShowHelper] = useState(false);
  const helperTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useImperativeHandle(ref, () => ({
    focusChat: () => {
      textareaRef.current?.focus();
    },
    getValue: () => value,
    showHelper: () => {
      showEmptyHelperTemporarily();
    },
  }));

  function goConversation() {
    const text = value.trim();
    if (!text) return;
    setBrief({ freeText: text });
    setValue("");
    setStep("conversation");
  }

  function showEmptyHelperTemporarily() {
    setShowHelper(true);
    if (helperTimerRef.current) clearTimeout(helperTimerRef.current);
    helperTimerRef.current = setTimeout(() => {
      setShowHelper(false);
      helperTimerRef.current = null;
    }, 2000);
  }

  useEffect(() => {
    return () => {
      if (helperTimerRef.current) clearTimeout(helperTimerRef.current);
    };
  }, []);

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      <div className="relative bg-neutral-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 shadow-xl">
        <div className="overflow-y-auto">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              if (showHelper) setShowHelper(false);
              setValue(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (value.trim()) {
                  goConversation();
                } else {
                  showEmptyHelperTemporarily();
                }
              }
            }}
            placeholder={t("landing.placeholder")}
            className={cn(
              "w-full px-4 sm:px-5 py-4",
              "resize-none",
              "bg-transparent",
              "border-none",
              "text-white text-[1.0625rem] leading-relaxed",
              "focus:outline-none",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-neutral-300 placeholder:text-[1.0625rem]",
              "min-h-[72px] max-h-[220px]"
            )}
            style={{ overflowY: "auto" }}
          />
        </div>
        <div
          className={cn(
            "px-4 pt-1",
            "text-xs text-neutral-400",
            "transition-opacity duration-300",
            showHelper ? "opacity-100" : "opacity-0"
          )}
        >
          {t("landing.emptyHelper")}
        </div>
        
        {/* Bottom action row: chips + Enter button */}
        <div className="px-3 sm:px-4 py-2.5 mt-1.5 border-t border-white/10 overflow-x-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-2 items-start sm:items-center">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (value.trim()) {
                    setBrief({ freeText: value });
                  }
                  setStep("conversation");
                }}
                className="flex w-auto h-10 items-center rounded-full px-3 text-sm font-medium border border-white/20 text-white hover:bg-white/10 hover:border-white/40 transition-all focus:outline-none focus:ring-2 focus:ring-white/20 min-w-[112px] max-w-full overflow-hidden"
              >
                <span className="truncate min-w-0 flex-1">{t("landing.cta.whatsapp")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (value.trim()) {
                    setBrief({ freeText: value });
                  }
                  setStep("conversation");
                }}
                className="flex w-auto h-10 items-center rounded-full px-3 text-sm font-medium border border-white/20 text-white hover:bg-white/10 hover:border-white/40 transition-all focus:outline-none focus:ring-2 focus:ring-white/20 min-w-[112px] max-w-full overflow-hidden"
              >
                <span className="truncate min-w-0 flex-1">{t("landing.cta.upload")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (value.trim()) {
                    setBrief({ freeText: value });
                  }
                  setStep("conversation");
                }}
                className="flex w-auto h-10 items-center rounded-full px-3 text-sm font-medium border border-white/20 text-white hover:bg-white/10 hover:border-white/40 transition-all focus:outline-none focus:ring-2 focus:ring-white/20 min-w-[112px] max-w-full overflow-hidden"
              >
                <span className="truncate min-w-0 flex-1">{t("landing.cta.carriers")}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={goConversation}
              className={cn(
                "inline-flex h-10 items-center rounded-full px-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-neutral-950 whitespace-nowrap min-w-[80px] justify-self-end sm:self-center",
                value.trim()
                  ? "bg-gradient-to-r from-[#38BDF8] via-[#0EA5E9] to-[#0284C7] text-white hover:opacity-90"
                  : "border border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/50"
              )}
              aria-disabled={!value.trim()}
              aria-label={t("landing.cta.enter")}
              title={t("landing.cta.enter")}
            >
              {t("landing.cta.enter")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

BrikiLandingChat.displayName = "BrikiLandingChat";

export default BrikiLandingChat;



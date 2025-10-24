"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUI } from "@/lib/ui/state";
import { SendHorizonal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";

export function Composer({ className, onSend, placeholder }: { className?: string; onSend?: (text: string) => void; placeholder?: string }) {
  const [value, setValue] = useState("");
  const [showHelper, setShowHelper] = useState(false);
  const helperTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { setStep, setBrief } = useUI();
  const composer = useTranslations("composer");

  const trimmed = value.trim();

  useEffect(() => {
    return () => {
      if (helperTimerRef.current) {
        clearTimeout(helperTimerRef.current);
      }
    };
  }, []);

  function hideHelper() {
    if (helperTimerRef.current) {
      clearTimeout(helperTimerRef.current);
      helperTimerRef.current = null;
    }
    if (showHelper) {
      setShowHelper(false);
    }
  }

  function showEmptyHelper() {
    setShowHelper(true);
    if (helperTimerRef.current) {
      clearTimeout(helperTimerRef.current);
    }
    helperTimerRef.current = setTimeout(() => {
      setShowHelper(false);
      helperTimerRef.current = null;
    }, 2000);
  }

  function goConversation() {
    const text = value.trim();
    if (!text) {
      showEmptyHelper();
      return;
    }

    if (onSend) {
      onSend(text);
      setValue("");
      hideHelper();
      return;
    }

    setBrief({ coverage: text.slice(0, 80), freeText: text });
    setValue("");
    hideHelper();
    setStep("conversation");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    goConversation();
  }

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) {
      return;
    }
    node.style.height = "auto";
    const maxHeight = 220;
    const nextHeight = Math.min(node.scrollHeight, maxHeight);
    node.style.height = `${nextHeight}px`;
  }, [value]);

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "rounded-2xl border border-border/50 bg-background/75 px-4 py-3 shadow-[0_24px_64px_-40px_rgba(15,23,42,0.6)] backdrop-blur-sm",
        "transition-colors duration-200",
        "focus-within:border-primary/40 focus-within:bg-background/90 focus-within:shadow-[0_28px_72px_-38px_rgba(15,23,42,0.55)]",
        className
      )}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="flex min-w-0 flex-col">
          <Textarea
            ref={textareaRef}
            rows={1}
            placeholder={placeholder ?? composer("placeholder")}
            value={value}
            onChange={(e) => {
              if (showHelper) {
                hideHelper();
              }
              setValue(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                goConversation();
              }
            }}
            className={cn(
              "w-full px-4 sm:px-5 py-4",
              "min-h-[72px] max-h-[220px] resize-none",
              "bg-transparent border-none shadow-none",
              "text-[1.0625rem] leading-relaxed text-foreground",
              "placeholder:text-muted-foreground/70",
              "transition-none"
            )}
            style={{ overflowY: "hidden" }}
          />
        </div>
        <div>
          <Button
            type="submit"
            disabled={!trimmed}
            variant={trimmed ? "default" : "outline"}
            size="default"
            className={cn(
              "w-full md:w-auto min-w-[112px] justify-center text-sm font-semibold",
              trimmed
                ? "shadow-md"
                : "border border-border/60 bg-transparent text-muted-foreground shadow-none hover:border-border hover:bg-muted/40"
            )}
          >
            <SendHorizonal className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "px-4 sm:px-5 pt-1 text-xs text-muted-foreground transition-opacity duration-300",
          showHelper ? "opacity-100" : "opacity-0"
        )}
      >
        {composer("emptyHelper")}
      </div>
    </form>
  );
}

export default Composer;


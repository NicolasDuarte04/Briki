"use client";

import { useEffect, useRef } from "react";

export interface HotkeysProps {
  primaryAction?: () => void;
  onToggleRightPanel?: () => void;
  onSetStep?: (index: number) => void;
}

function isTypingInInput(): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return false;
  if (active.closest("[data-hotkeys-suspend]")) return true;
  const tag = active.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  if (active.isContentEditable) return true;
  return false;
}

export default function Hotkeys({
  primaryAction,
  onToggleRightPanel,
  onSetStep,
}: HotkeysProps) {
  const lastQuestionMarkRef = useRef<number>(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      if (isTypingInInput()) return;

      const key = e.key;
      const lowerKey = key.toLowerCase();
      const isMeta = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+K → custom event "briki:cmdk"
      if (isMeta && lowerKey === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("briki:cmdk"));
        return;
      }

      // Cmd/Ctrl+Enter → call primaryAction
      if (isMeta && lowerKey === "enter") {
        e.preventDefault();
        if (primaryAction) primaryAction();
        return;
      }

      // Cmd/Ctrl+J → toggle right panel
      if (isMeta && lowerKey === "j") {
        e.preventDefault();
        if (onToggleRightPanel) onToggleRightPanel();
        else window.dispatchEvent(new CustomEvent("briki:toggle-right"));
        return;
      }

      // Number keys 1–8 → setStep(index)
      if (!e.altKey && !e.metaKey && !e.ctrlKey) {
        const numberMap: Record<string, number> = {
          "1": 1,
          "2": 2,
          "3": 3,
          "4": 4,
          "5": 5,
          "6": 6,
          "7": 7,
          "8": 8,
        };
        const idx = numberMap[lowerKey];
        if (idx) {
          if (onSetStep) onSetStep(idx);
          else window.dispatchEvent(new CustomEvent("briki:set-step", { detail: { index: idx } }));
          return;
        }
      }

      // Question mark → open hotkeys guide
      if (!e.altKey && !e.metaKey && !e.ctrlKey && key === "?") {
        const now = Date.now();
        if (now - lastQuestionMarkRef.current < 300) return;
        lastQuestionMarkRef.current = now;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("briki:hotkeys"));
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [primaryAction, onToggleRightPanel, onSetStep]);

  return null;
}



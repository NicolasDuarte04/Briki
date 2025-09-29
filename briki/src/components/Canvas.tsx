"use client";

import { cn } from "@/lib/utils";
import {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";

const STORAGE_KEY = "briki:split:ratio";
const DEFAULT_RATIO = 0.4; // 40% left, 60% right
const MIN_RATIO = 0.2;
const MAX_RATIO = 0.8;
const HANDLE_SIZE = 8;
const CSS_VAR_NAME = "--briki-split-left";
const CSS_RATIO_VAR_NAME = "--briki-split-left-ratio";
const SMALL_SCREEN_BREAKPOINT = 1024;

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function parseRatio(value?: string | null) {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  const hasPercent = raw.endsWith("%");
  const cleaned = raw.replace("%", "").trim();
  const parsed = parseFloat(cleaned);

  if (Number.isNaN(parsed)) return null;

  if (hasPercent) {
    const ratio = parsed / 100;
    if (ratio < 0 || ratio > 1) return null;
    return ratio;
  }

  if (parsed >= 0 && parsed <= 1) {
    return parsed;
  }

  if (parsed >= 0 && parsed <= 100) {
    return parsed / 100;
  }

  return null;
}

function readStoredSplitRatio() {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsedStored = parseRatio(stored);
    if (parsedStored !== null) {
      return Math.max(MIN_RATIO, Math.min(parsedStored, MAX_RATIO));
    }
  } catch (error) {
    // Ignore storage access issues
  }

  if (typeof document === "undefined") return null;

  const computedStyles = window.getComputedStyle(document.documentElement);

  const cssRatio = parseRatio(
    computedStyles.getPropertyValue(CSS_RATIO_VAR_NAME)
  );
  if (cssRatio !== null) {
    return Math.max(MIN_RATIO, Math.min(cssRatio, MAX_RATIO));
  }

  const cssPercent = parseRatio(computedStyles.getPropertyValue(CSS_VAR_NAME));
  if (cssPercent !== null) {
    return Math.max(MIN_RATIO, Math.min(cssPercent, MAX_RATIO));
  }

  const inlineRatio = parseRatio(
    document.documentElement.style.getPropertyValue(CSS_RATIO_VAR_NAME)
  );
  if (inlineRatio !== null) {
    return Math.max(MIN_RATIO, Math.min(inlineRatio, MAX_RATIO));
  }

  const inlinePercent = parseRatio(
    document.documentElement.style.getPropertyValue(CSS_VAR_NAME)
  );
  if (inlinePercent !== null) {
    return Math.max(MIN_RATIO, Math.min(inlinePercent, MAX_RATIO));
  }

  return null;
}

function setDocumentSplitRatio(ratio: number) {
  if (typeof document === "undefined") return;
  const clamped = Math.max(MIN_RATIO, Math.min(ratio, MAX_RATIO));
  document.documentElement.style.setProperty(
    CSS_VAR_NAME,
    `${clamped * 100}%`
  );
  document.documentElement.style.setProperty(
    CSS_RATIO_VAR_NAME,
    clamped.toString()
  );
}

function getInitialSplitRatio() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return DEFAULT_RATIO;
  }

  const storedRatio = readStoredSplitRatio();
  if (storedRatio !== null) {
    return storedRatio;
  }

  return DEFAULT_RATIO;
}

function clampRatioValue(ratio: number) {
  if (Number.isNaN(ratio)) return DEFAULT_RATIO;
  return Math.max(MIN_RATIO, Math.min(ratio, MAX_RATIO));
}

export function Canvas({
  left,
  right,
  className,
  rightOpen = true,
  isSourcing = false,
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
  rightOpen?: boolean;
  isSourcing?: boolean;
}) {
  const showRight = rightOpen || isSourcing;
  const innerPadding = "px-4 pb-8 pt-6 sm:px-6";
  
  // Initialize with a safe default for SSR; will be replaced by stored value on mount without flicker
  const [splitRatio, setSplitRatio] = useState(getInitialSplitRatio);
  const [isDragging, setIsDragging] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({ startX: 0, startRatio: DEFAULT_RATIO });

  const clampRatio = useCallback((ratio: number) => clampRatioValue(ratio), []);

  // Check screen size after mount
  useEffect(() => {
    const checkScreenSize = () => {
      const isSmall = window.innerWidth < SMALL_SCREEN_BREAKPOINT;
      setIsSmallScreen(isSmall);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Keep CSS variable in sync with React state
  useIsomorphicLayoutEffect(() => {
    setDocumentSplitRatio(splitRatio);
  }, [splitRatio]);
  
  // Persist ratio to localStorage
  const persistRatio = useCallback((ratio: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, ratio.toString());
    } catch (error) {
      // Ignore storage errors (e.g., quota exceeded or disabled cookies)
    }
    setDocumentSplitRatio(ratio);
  }, []);
  
  useIsomorphicLayoutEffect(() => {
    const stored = readStoredSplitRatio();
    if (stored !== null) {
      setSplitRatio(stored);
    }
  }, []);

  // Handle pointer events for dragging
  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (isSmallScreen || !containerRef.current) return;
    
    e.preventDefault();
    setIsDragging(true);
    
    dragStateRef.current = {
      startX: e.clientX,
      startRatio: splitRatio,
    };
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isSmallScreen, splitRatio]);

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || isSmallScreen || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStateRef.current.startX;
    const deltaRatio = rect.width > 0 ? deltaX / rect.width : 0;
    const newRatio = dragStateRef.current.startRatio + deltaRatio;
    const clamped = clampRatio(newRatio);
    
    setSplitRatio(clamped);
  }, [isDragging, isSmallScreen, clampRatio]);

  const handlePointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    persistRatio(splitRatio);
  }, [isDragging, splitRatio, persistRatio]);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (isSmallScreen) return;
    
    let newRatio = splitRatio;
    const step = e.shiftKey ? 0.1 : 0.02;
    
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        newRatio = splitRatio - step;
        break;
      case "ArrowRight":
        e.preventDefault();
        newRatio = splitRatio + step;
        break;
      case "Home":
        e.preventDefault();
        newRatio = 0.3; // 30/70 split
        break;
      case "End":
        e.preventDefault();
        newRatio = 0.7; // 70/30 split
        break;
      case "Enter":
        e.preventDefault();
        // Confirm current position
        persistRatio(splitRatio);
        return;
      case "Escape":
        e.preventDefault();
        // Reset to default
        newRatio = DEFAULT_RATIO;
        break;
      default:
        return;
    }
    
    const clamped = clampRatio(newRatio);
    setSplitRatio(clamped);
    if (e.key !== "Escape") {
      persistRatio(clamped);
    }
  }, [isSmallScreen, splitRatio, clampRatio, persistRatio]);
  
  // Handle double-click to reset to 50/50
  const handleDoubleClick = useCallback(() => {
    if (isSmallScreen) return;
    const newRatio = 0.5;
    setSplitRatio(newRatio);
    persistRatio(newRatio);
  }, [isSmallScreen, persistRatio]);
  
  // Ensure ratio stays within bounds when container resizes
  useEffect(() => {
    const clamped = clampRatio(splitRatio);
    if (clamped !== splitRatio) {
      setSplitRatio(clamped);
    }
  }, [splitRatio, clampRatio]);
  
  // Calculate aria values for accessibility
  const ariaValueNow = Math.round(splitRatio * 100);
  const ariaValueMin = Math.round(MIN_RATIO * 100);
  const ariaValueMax = Math.round(MAX_RATIO * 100);

  // Stack vertically on small screens
  if (isSmallScreen) {
    return (
      <div className={cn("flex-1 h-screen flex flex-col gap-y-8 overflow-hidden", className)}>
        <section className="flex h-full flex-col bg-background min-w-0 overflow-auto">
          <div className={cn("flex h-full flex-1 flex-col gap-6 overflow-auto", innerPadding)}>
            <div className="flex-1 h-full">{left}</div>
          </div>
        </section>
        {showRight && (
          <section className="flex h-full flex-col bg-background min-w-0 overflow-auto">
            <div className={cn("flex h-full flex-1 flex-col gap-6 overflow-auto", innerPadding)}>
              <div className="flex-1 h-full">{right}</div>
            </div>
          </section>
        )}
      </div>
    );
  }

  const containerStyle: CSSProperties | undefined = showRight
    ? (
        {
          [CSS_VAR_NAME]: `${splitRatio * 100}%`,
          [CSS_RATIO_VAR_NAME]: splitRatio,
        } as React.CSSProperties
      )
    : undefined;

  const leftPanelStyle: CSSProperties | undefined = showRight
    ? { flexBasis: `${splitRatio * 100}%`, flexGrow: 0, flexShrink: 1 }
    : undefined;

  const rightPanelStyle: CSSProperties | undefined = showRight
    ? { flexBasis: `${(1 - splitRatio) * 100}%`, flexGrow: 0, flexShrink: 1 }
    : undefined;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 h-full flex overflow-hidden",
        isDragging && "select-none",
        className
      )}
      style={containerStyle}
    >
      {/* Left panel */}
      <section
        className="flex h-full flex-col bg-background min-w-0 overflow-auto"
        style={leftPanelStyle}
      >
        <div className={cn("flex h-full flex-1 flex-col gap-6 overflow-auto", innerPadding)}>
          <div className="flex-1">{left}</div>
        </div>
      </section>
      
      {showRight && (
        <>
          {/* Resize handle */}
          <div
            ref={handleRef}
            role="separator"
            aria-orientation="vertical"
            aria-valuemin={ariaValueMin}
            aria-valuemax={ariaValueMax}
            aria-valuenow={ariaValueNow}
            aria-label="Resize split between chat and workspace"
            tabIndex={0}
            data-print="hide"
            className={cn(
              "flex-shrink-0 relative cursor-col-resize bg-border/30 hover:bg-border/60 focus:bg-primary/20",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset",
              "transition-colors duration-150",
              isDragging && "bg-primary/30"
            )}
            style={{ flexBasis: `${HANDLE_SIZE}px`, flexGrow: 0, flexShrink: 0 }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onKeyDown={handleKeyDown}
            onDoubleClick={handleDoubleClick}
          >
            {/* Visual affordance */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border/60" />
          </div>
          
          {/* Right panel */}
          <section
            className="flex h-full flex-col bg-background min-w-0 overflow-auto"
            style={rightPanelStyle}
          >
            <div className={cn("flex h-full flex-1 flex-col gap-6 overflow-auto", innerPadding)}>
              <div className="flex-1">{right}</div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Canvas;



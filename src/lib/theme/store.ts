"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

/**
 * Theme store using Zustand with localStorage persistence.
 * 
 * - theme: User preference ("light" | "dark" | "system")
 * - resolvedTheme: The actual applied theme after resolving "system"
 * - setTheme: Updates preference and applies the appropriate class to <html>
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "system",
      resolvedTheme: "light",

      setTheme: (theme: Theme) => {
        const resolved = resolveTheme(theme);
        applyThemeToDOM(resolved);
        set({ theme, resolvedTheme: resolved });
      },
    }),
    {
      name: "briki-theme",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }), // Only persist user preference
      onRehydrateStorage: () => (state) => {
        // After hydration, apply the correct theme
        if (state) {
          const resolved = resolveTheme(state.theme);
          applyThemeToDOM(resolved);
          state.resolvedTheme = resolved;
        }
      },
    }
  )
);

/**
 * Resolves the theme preference to an actual theme value.
 * If "system", checks the OS preference.
 */
function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light"; // SSR fallback
  }
  return theme;
}

/**
 * Applies the theme class to the <html> element
 */
function applyThemeToDOM(theme: "light" | "dark") {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    // Update color-scheme for native elements
    root.style.colorScheme = theme;
  }
}

/**
 * Initialize theme on app load (call this in a client component)
 * Also sets up listener for system preference changes
 */
export function initializeTheme() {
  const { theme, setTheme } = useThemeStore.getState();
  
  // Apply initial theme
  const resolved = resolveTheme(theme);
  applyThemeToDOM(resolved);
  useThemeStore.setState({ resolvedTheme: resolved });

  // Listen for system preference changes
  if (typeof window !== "undefined" && theme === "system") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (useThemeStore.getState().theme === "system") {
        const newResolved = e.matches ? "dark" : "light";
        applyThemeToDOM(newResolved);
        useThemeStore.setState({ resolvedTheme: newResolved });
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }
}


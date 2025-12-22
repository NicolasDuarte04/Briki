"use client";

import { useEffect, type ReactNode } from "react";
import { useThemeStore, initializeTheme } from "./store";

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider component that initializes and manages the theme state.
 * 
 * Must be placed inside the body to properly apply classes to <html>.
 * Handles:
 * - Initial theme application on mount
 * - System preference change detection
 * - Prevents flash of wrong theme (FOUC)
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    // Initialize theme and set up system preference listener
    const cleanup = initializeTheme();
    return cleanup;
  }, []);

  // Re-run when theme preference changes
  useEffect(() => {
    const { setTheme } = useThemeStore.getState();
    setTheme(theme);
  }, [theme]);

  return <>{children}</>;
}


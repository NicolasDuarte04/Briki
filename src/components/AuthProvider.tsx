"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  status: AuthStatus;
  /** Internal flag to prevent rendering CTAs while still initializing */
  ready: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [ready, setReady] = useState(false);

  const updateAuthState = useCallback((newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);
    setStatus(newSession ? "authenticated" : "unauthenticated");
    setReady(true);
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    // Initialize: read current session synchronously (from local storage)
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();
        updateAuthState(initialSession);
      } catch (error) {
        console.error("[AuthProvider] Error initializing auth:", error);
        updateAuthState(null);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        console.log("[AuthProvider] Auth state changed:", event);
        updateAuthState(newSession);
      }
    );

    // Cleanup: unsubscribe on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [updateAuthState]);

  const value: AuthContextValue = {
    user,
    session,
    status,
    ready,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

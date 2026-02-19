"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);
  const statusRef = useRef<AuthStatus>(status);
  
  // Keep statusRef in sync
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const updateAuthState = useCallback((newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);
    setStatus(newSession ? "authenticated" : "unauthenticated");
    setReady(true);
  }, []);

  // Re-verify session on route changes (handles post-login redirect)
  useEffect(() => {
    // Skip on initial render
    if (previousPathRef.current === null) {
      previousPathRef.current = pathname;
      return;
    }

    // Only re-verify if pathname actually changed
    if (previousPathRef.current !== pathname) {
      previousPathRef.current = pathname;
      
      // Re-verify session after route change, especially important when
      // transitioning from auth pages (login/register) where session might have been created
      const reVerifySession = async () => {
        // Temporarily set to loading to show skeletons during re-verification
        // Only do this if we're currently unauthenticated (possible post-login scenario)
        if (statusRef.current === "unauthenticated") {
          setReady(false);
        }
        
        const supabase = createBrowserSupabase();
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          // Always update to ensure consistency
          updateAuthState(currentSession);
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.error("[AuthProvider] Error re-verifying session:", error);
          }
          setReady(true); // Restore ready state on error
        }
      };
      
      reVerifySession();
    }
  }, [pathname, updateAuthState]);

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
        if (process.env.NODE_ENV !== 'production') {
          console.error("[AuthProvider] Error initializing auth:", error);
        }
        updateAuthState(null);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log("[AuthProvider] Auth state changed:", event);
        }
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

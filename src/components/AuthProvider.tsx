"use client";

import type { ReactNode } from "react";

// TODO: Replace this provider with Supabase session context once available.
export default function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

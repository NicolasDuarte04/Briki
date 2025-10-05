"use client";

import { useEffect } from "react";

// TODO: Wire this component to Supabase session state once available.
export function OnboardingCheck() {
  useEffect(() => {
    console.warn("OnboardingCheck requires Supabase auth integration before it can enforce redirects.");
  }, []);

  return null;
}

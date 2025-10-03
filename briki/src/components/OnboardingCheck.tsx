"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export function OnboardingCheck() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only run the check if we have a session loaded
    if (status === "loading") return;

    // Skip if we're already on the onboarding page
    if (pathname.startsWith("/onboarding")) return;

    // Skip if this is a public route
    const publicRoutes = ["/", "/api/auth"];
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route));
    if (isPublicRoute) return;

    // If authenticated but no profile data, redirect to onboarding
    if (session?.user) {
      const user = session.user as typeof session.user & {
        profileId?: string | null;
        onboardingCompleted?: boolean | null;
      };

      if (!user.profileId || user.onboardingCompleted !== true) {
        router.push("/onboarding");
      }
    }
  }, [session, status, pathname, router]);

  return null;
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/../auth-edge";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const pathname = request.nextUrl.pathname;

  // Short-circuit for system assets and API (also handled by matcher, kept defensive here)
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // Allow static assets from /public to bypass auth (needed for Next/Image optimizer fetches)
  const isStaticAsset =
    pathname.startsWith("/brand/") ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json|css|js|woff2?|ttf|eot)$/.test(pathname);
  if (isStaticAsset) {
    return NextResponse.next();
  }

  // Public paths (do not require authentication)
  const isOnboardingPath = pathname.startsWith("/onboarding");
  const isPublicPath = pathname === "/" || pathname === "/login" || isOnboardingPath;
  const isRootPath = pathname === "/";

  // If authenticated, ensure onboarding is completed before allowing access to app pages
  if (session) {
    const onboardingCompleted = (session.user as unknown as { onboardingCompleted?: boolean })?.onboardingCompleted === true;
    if (!onboardingCompleted && !isOnboardingPath && !isRootPath) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    return NextResponse.next();
  }

  // If unauthenticated and path is protected, redirect to login
  if (!isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    
    // Exclude Next internals, favicon, static assets, and brand images
    "/((?!api|_next/static|_next/image|favicon.ico|brand/.*|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json|css|js|woff|woff2|ttf|eot)).*)",
  ],
};
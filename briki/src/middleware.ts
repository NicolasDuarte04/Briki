import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Create response to potentially modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Determine session presence strictly from cookies (no network calls)
  const accessCookie = request.cookies.get('sb-access-token') ?? request.cookies.get('sb:token');
  const refreshCookie = request.cookies.get('sb-refresh-token') ?? request.cookies.get('sb:refresh-token');
  const hasSession = Boolean(accessCookie?.value || refreshCookie?.value || request.cookies.getAll().some(({ name, value }) => (
    (name.startsWith('sb-') || name.startsWith('sb:')) &&
    (name.includes('access') || name.includes('refresh')) &&
    Boolean(value)
  )));

  const { pathname } = request.nextUrl;

  // Define public routes that do not require authentication
  const publicRoutes = ['/login', '/register', '/auth/verify', '/auth/callback'];

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // If there is no session and the route is not public, redirect to login
  if (!hasSession && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If there is a session and the user tries to access login, register, or landing page, redirect them away
  if (hasSession && (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    // Redirect authenticated users to their profile
    return NextResponse.redirect(new URL('/profile', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Exclude Next internals, favicon, static assets, and brand images
    "/((?!api|_next/static|_next/image|favicon.ico|brand/.*|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json|css|js|woff|woff2|ttf|eot)).*)",
  ],
};

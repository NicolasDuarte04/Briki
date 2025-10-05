import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  // Create response to potentially modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client with cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options });
            response.cookies.set({ name, value, ...options });
          });
        },
      },
      auth: {
        // Edge runtime compatible settings
        flowType: "pkce",
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );

  // Get the session from cookies only - no DB calls
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  // Define protected routes (routes under (app) group)
  const isProtectedRoute = pathname.startsWith("/onboarding") || 
                          pathname.startsWith("/profile");

  // Define auth routes that should be accessible without authentication
  const isAuthRoute = pathname.startsWith("/login") || 
                     pathname.startsWith("/register");

  // If no session and trying to access protected route, redirect to login
  if (!session && isProtectedRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If session exists and trying to access auth routes, redirect to profile
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Exclude Next internals, favicon, static assets, and brand images
    "/((?!api|_next/static|_next/image|favicon.ico|brand/.*|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json|css|js|woff|woff2|ttf|eot)).*)",
  ],
};

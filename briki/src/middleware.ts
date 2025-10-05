import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  // App routes that require authentication
  const appRoutes = ['/profile']; // Add other app routes here as needed

  // Check if the current path is an app route that needs protection
  const isAppRoute = appRoutes.some(route => pathname.startsWith(route));

  if (!isAppRoute) {
    return response;
  }

  // If it's a protected app route, check for a session
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - brand/ (brand assets)
     * - / (the root path)
     *
     * Also, exclude paths with file extensions like .png, .jpg, etc.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|brand/.*|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json|css|js|woff|woff2|ttf|eot)|^/$).*)",
  ],
};

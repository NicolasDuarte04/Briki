import createMiddleware from 'next-intl/middleware';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { getDashboardHome, type Locale } from '@/lib/routes/workspace';

const intlMiddleware = createMiddleware({
  locales: ['en', 'es'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',
  localeDetection: true,
});

/**
 * MIDDLEWARE FLOW DIAGNOSTIC
 * ===========================
 * 
 * PURPOSE:
 * Redirect authenticated users from marketing pages to workspace while preserving:
 * - Crawler/guest access to static marketing pages
 * - Team review bypass via ?landing=1
 * - Locale preservation
 * - Protection of app routes for unauthenticated users
 * 
 * DECISION FLOW:
 * 1. Run next-intl middleware for locale handling
 * 2. Extract locale from pathname (es/en)
 * 3. Check for ?landing=1 bypass (skips auth redirect if present)
 * 4. Identify marketing root paths (/ or /<locale>)
 * 5. For marketing roots: check auth & redirect to workspace
 * 6. For protected app routes: check auth & redirect to login if needed
 * 7. For all other paths: allow through
 * 
 * EDGE CASES HANDLED:
 * - Loop prevention: Never redirect if already on /dashboard or /workspace
 * - Bypass: ?landing=1 always shows marketing (for team reviews/demos)
 * - Crawlers: Unauthenticated requests get static marketing (SEO preserved)
 * - Locale: Redirects preserve user's locale (e.g., /es → /es/dashboard)
 * - Assets: Matcher excludes _next/static, images, api routes, files with extensions
 * - Auth flows: /login, /register, /auth/** remain public
 * 
 * MATCHER SAFETY:
 * The matcher excludes:
 * - Static assets: _next/static, _next/image, favicon.ico, brand/
 * - API routes: api/**
 * - Files: *.*  (any file with extension)
 * This prevents middleware from running on resources where redirects would break functionality.
 * 
 * TEST MATRIX:
 * ┌─────────────────────┬──────────────┬─────────────┬──────────────────────────────────┐
 * │ Request             │ Auth Status  │ Query       │ Result                           │
 * ├─────────────────────┼──────────────┼─────────────┼──────────────────────────────────┤
 * │ /                   │ Yes          │ none        │ Redirect → /es/workspace         │
 * │ /                   │ No           │ none        │ Marketing (static)               │
 * │ /es                 │ Yes          │ none        │ Redirect → /es/workspace         │
 * │ /es                 │ No           │ none        │ Marketing (static)               │
 * │ /en                 │ Yes          │ none        │ Redirect → /en/workspace         │
 * │ /es?landing=1       │ Yes          │ landing=1   │ Marketing (bypass)               │
 * │ /es?landing=1       │ No           │ landing=1   │ Marketing (static)               │
 * │ /es/dashboard       │ Yes          │ none        │ Allow (no loop)                  │
 * │ /es/dashboard       │ No           │ none        │ Redirect → /es/login?next=...    │
 * │ /es/workspace       │ Yes          │ none        │ Allow                            │
 * │ /es/workspace       │ No           │ none        │ Redirect → /es/login?next=...    │
 * │ /es/agent           │ Yes          │ none        │ Allow (protected route)          │
 * │ /es/agent           │ No           │ none        │ Redirect → /es/login?next=...    │
 * │ /es/agent/123       │ Yes          │ none        │ Allow (protected route)          │
 * │ /es/agent/123       │ No           │ none        │ Redirect → /es/login?next=...    │
 * │ /workspace          │ Any          │ none        │ Redirect → /es/dashboard (alias) │
 * │ /es/login           │ Any          │ none        │ Allow (public)                   │
 * │ /_next/static/...   │ Any          │ Any         │ Never hits middleware            │
 * │ /api/...            │ Any          │ Any         │ Never hits middleware            │
 * └─────────────────────┴──────────────┴─────────────┴──────────────────────────────────┘
 */
export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const { pathname, searchParams } = request.nextUrl;

  // Early redirect: /workspace → /<cookieLocale>/dashboard
  // ONLY redirect the bare /workspace alias, not localized workspace paths
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value || 'es';
  if (pathname === '/workspace') {
    return NextResponse.redirect(new URL(getDashboardHome(cookieLocale as Locale), request.url), 308);
  }

  // Extract locale from pathname (es, en, or empty for root)
  const localeMatch = pathname.match(/^\/(es|en)/);
  const locale = localeMatch ? localeMatch[1] : 'es'; // default to 'es'
  
  // Strip locale prefix if present to check the actual path
  const pathWithoutLocale = pathname.replace(/^\/(es|en)/, '') || '/';

  // Check for ?landing=1 bypass (team reviews/demos)
  const hasLandingBypass = searchParams.get('landing') === '1';

  // Public paths that are always accessible
  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/auth/verify',
    '/auth/callback',
    '/auth/error',
    '/auth/update-password',
  ];

  // Check if the path is explicitly public
  const isPublicPath = publicPaths.some(
    (path) => pathWithoutLocale === path || pathWithoutLocale.startsWith(path + '/')
  );

  // Check if this is a marketing root (/ or /<locale>)
  const isMarketingRoot = pathWithoutLocale === '/';

  // Check if the path targets a protected scope (e.g., /(app))
  // Protected routes are those under /profile, /dashboard, /workspace, /agent, /onboarding or other app routes
  const isProtectedRoute = /^\/(profile|dashboard|workspace|agent|onboarding|settings)/.test(pathWithoutLocale);

  // Initialize Supabase client for auth check (only when needed)
  let user = null;
  
  // We need to check auth in two cases:
  // 1. Marketing root (to redirect authenticated users to workspace)
  // 2. Protected routes (to guard against unauthenticated access)
  if ((isMarketingRoot && !hasLandingBypass) || isProtectedRoute) {
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  // CASE 1: Marketing root with authenticated user (no bypass)
  // → Redirect to workspace to skip marketing
  if (isMarketingRoot && user && !hasLandingBypass) {
    const workspaceUrl = new URL(getDashboardHome(locale as Locale), request.url);
    return NextResponse.redirect(workspaceUrl, { status: 307 }); // Temporary redirect
  }

  // CASE 2: Public paths (including marketing root for guests/bypass)
  // → Allow access
  if (isPublicPath) {
    return response;
  }

  // CASE 3: Protected routes
  // → Check auth and redirect to login if needed
  if (isProtectedRoute) {
    if (!user) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // CASE 4: All other paths
  // → Allow through
  return response;
}

export const runtime = 'nodejs';

export const config = {
  matcher: [
    '/',
    '/(es|en)/:path*',
    '/((?!_next/static|_next/image|favicon.ico|brand/|api/|.*\\..*).*)',
  ],
};

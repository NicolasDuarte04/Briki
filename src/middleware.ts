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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block invalid /landing/* subroutes - redirect to /landing
  // This prevents [locale] from capturing "landing" as a locale
  if (pathname.startsWith('/landing/')) {
    return NextResponse.redirect(new URL('/landing', request.url));
  }

  const response = intlMiddleware(request);

  // Strip locale prefix if present to check the actual path
  const pathWithoutLocale = pathname.replace(/^\/(es|en)/, '') || '/';
  
  // Extract locale from pathname for redirection
  const localeMatch = pathname.match(/^\/(es|en)/);
  const locale = (localeMatch ? localeMatch[1] : 'es') as Locale;

  // Check for ?landing=1 bypass parameter
  const bypassLanding = request.nextUrl.searchParams.get('landing') === '1';

  // Public paths that are always accessible
  const publicPaths = [
    '/',
    '/landing', // <-- AÑADIR RUTA DEDICADA
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

  // If it's a public path, check for authentication redirect
  if (isPublicPath) {
    // For marketing root paths (/, /es, /en), check if user is authenticated
    const isMarketingRoot = pathWithoutLocale === '/';
    
    if (isMarketingRoot && !bypassLanding) {
      // Create Supabase client to check authentication
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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // If user is authenticated, redirect to dashboard
      if (user) {
        const dashboardUrl = getDashboardHome(locale);
        return NextResponse.redirect(new URL(dashboardUrl, request.url));
      }
    }
    
    return response;
  }

  // Check if the path targets a protected scope (e.g., /(app))
  // Protected routes are those under /profile, /dashboard, /workspace, /agent or other app routes
  const isProtectedRoute = /^\/(profile|dashboard|workspace|agent|settings)/.test(pathWithoutLocale);

  // If not a protected route, allow access
  if (!isProtectedRoute) {
    return response;
  }

  // For protected routes, check for session using SSR helper (no DB query)
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If no user, redirect to login with next parameter
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    // Only add 'next' parameter for routes that are valid post-login destinations
    // Exclude agent routes (placeholders, temporary routes) from being added as 'next'
    if (!pathname.includes('/agent')) {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Matcher optimizado para excluir rutas internas y de activos de Next.js
  // Nota: /landing (exacto) está excluido, pero /landing/* se procesa para redirigir
  matcher: [
    // Capturar /landing/* subrutas para redirigir (no excluir completamente)
    '/landing/:path+',
    // Excluir rutas de API, _next/static, _next/image, assets, favicon.ico, brand, landing exacto, robots.txt, sitemap.xml, iconos PWA
    '/((?!api|_next/static|_next/image|assets|favicon.ico|brand|landing$|robots.txt|sitemap.xml|apple-touch-icon|site.webmanifest|android-chrome|favicon-).*)',
  ],
};

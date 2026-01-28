import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

// Cookie name for locale persistence - must match actions.ts
const LOCALE_COOKIE_NAME = 'BRIKI_LOCALE';
const VALID_LOCALES = ['en', 'es'] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  // Priority order:
  // 1. URL locale (from requestLocale)
  // 2. Cookie locale (BRIKI_LOCALE)
  // 3. Default 'en'
  
  let locale = await requestLocale;
  
  // If no URL locale, try to get from cookie
  if (!locale) {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
    if (cookieLocale && VALID_LOCALES.includes(cookieLocale as typeof VALID_LOCALES[number])) {
      locale = cookieLocale;
    }
  }
  
  // Fallback to default
  locale = locale || 'en';
  
  // Validate the locale
  const validLocale = VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number]) ? locale : 'en';
  
  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.ts`)).default,
    timeZone: 'America/Mexico_City',
  };
});

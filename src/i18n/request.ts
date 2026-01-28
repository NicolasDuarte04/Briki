import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  // Get the locale from the request
  const locale = await requestLocale || 'en';
  
  // Validate the locale
  const validLocales = ['en', 'es'];
  const validLocale = validLocales.includes(locale) ? locale : 'en';
  
  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.ts`)).default,
    timeZone: 'America/Mexico_City',
  };
});

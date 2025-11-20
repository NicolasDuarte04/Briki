import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  // Get the locale from the request
  const locale = await requestLocale || 'es';
  
  // Validate the locale
  const validLocales = ['es', 'en'];
  const validLocale = validLocales.includes(locale) ? locale : 'es';
  
  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.ts`)).default,
    timeZone: 'America/Mexico_City',
  };
});

import { MetadataRoute } from 'next';

/**
 * Sitemap configuration for search engines
 * 
 * This file generates a sitemap.xml that helps search engines discover
 * and index the site's public pages. Only includes public-facing routes
 * with appropriate priority and update frequency.
 * 
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://briki.com';
  const currentDate = new Date();

  // Define supported locales
  const locales = ['en', 'es'];
  
  // Only include public pages - exclude auth-required pages
  const publicRoutes: MetadataRoute.Sitemap = [];

  // Homepage / Landing pages - highest priority, updated daily
  locales.forEach((locale) => {
    publicRoutes.push({
      url: `${siteUrl}/${locale}`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: {
          es: `${siteUrl}/es`,
          en: `${siteUrl}/en`,
        },
      },
    });
  });

  // Root redirect page
  publicRoutes.push({
    url: siteUrl,
    lastModified: currentDate,
    changeFrequency: 'daily',
    priority: 1.0,
  });

  return publicRoutes;
}
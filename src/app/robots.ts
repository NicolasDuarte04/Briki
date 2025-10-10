import { MetadataRoute } from 'next';

/**
 * Robots.txt configuration for search engine crawlers
 * 
 * This file defines which routes crawlers can access and provides
 * the sitemap location for better indexing.
 * 
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://briki.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/en/', '/es/'],
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/*/profile',      // Block all profile pages
          '/*/login',        // Block all login pages
          '/*/register',     // Block all register pages
          '/*/update-password', // Block password update pages
          '/auth/',          // Block auth callback routes
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
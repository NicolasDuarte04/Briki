# SEO Setup: Robots.txt & Sitemap.xml

## Overview

This document describes the SEO crawler configuration for the Briki application, including `robots.txt` and `sitemap.xml` setup.

## Files Created

### 1. `/src/app/robots.ts`

Generates the `robots.txt` file that instructs search engine crawlers which routes to index.

**Features:**
- ✅ Allows crawling of public marketing pages (`/`, `/en/`, `/es/`)
- ✅ Blocks crawling of API routes, auth pages, and user-specific pages
- ✅ Provides sitemap location for better indexing
- ✅ Production-ready with environment variable support

**Generated route:** `https://your-domain.com/robots.txt`

### 2. `/src/app/sitemap.ts`

Generates the `sitemap.xml` file that lists all public pages with metadata for search engines.

**Features:**
- ✅ Multi-locale support (English & Spanish)
- ✅ Priority and change frequency metadata
- ✅ Last modified timestamps
- ✅ Production-ready with environment variable support

**Generated route:** `https://your-domain.com/sitemap.xml`

## Environment Variables

### Required for Production

Add this to your production environment (Vercel, Railway, etc.):

```bash
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

**Example:**
```bash
NEXT_PUBLIC_SITE_URL=https://briki.app
```

### Development

In development, both files default to `http://localhost:3000` if `NEXT_PUBLIC_SITE_URL` is not set.

## Testing

### Local Development

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Access the routes in your browser:
   - **Robots.txt:** http://localhost:3000/robots.txt
   - **Sitemap.xml:** http://localhost:3000/sitemap.xml

3. Verify the output:
   
   **Robots.txt should show:**
   ```
   User-Agent: *
   Allow: /
   Allow: /en/
   Allow: /es/
   Disallow: /api/
   Disallow: /**/login
   Disallow: /**/register
   Disallow: /**/profile
   Disallow: /**/update-password
   Disallow: /auth/
   
   Sitemap: http://localhost:3000/sitemap.xml
   ```
   
   **Sitemap.xml should show:**
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>http://localhost:3000/en</loc>
       <lastmod>2025-10-07T...</lastmod>
       <changeFrequency>weekly</changeFrequency>
       <priority>1.0</priority>
     </url>
     <url>
       <loc>http://localhost:3000/es</loc>
       <lastmod>2025-10-07T...</lastmod>
       <changeFrequency>weekly</changeFrequency>
       <priority>1.0</priority>
     </url>
   </urlset>
   ```

### Production Testing

After deployment, verify the routes work:

```bash
# Test robots.txt
curl https://your-domain.com/robots.txt

# Test sitemap.xml
curl https://your-domain.com/sitemap.xml
```

## Google Search Console Verification

1. **Submit Sitemap:**
   - Go to [Google Search Console](https://search.google.com/search-console)
   - Navigate to "Sitemaps" in the left sidebar
   - Add new sitemap: `https://your-domain.com/sitemap.xml`
   - Click "Submit"

2. **Verify Robots.txt:**
   - In Search Console, go to "Settings" → "Robots.txt"
   - View your robots.txt file to ensure it's accessible
   - Check for any reported errors

3. **Monitor Indexing:**
   - Go to "Pages" in Search Console
   - Verify that public pages (landing pages) are indexed
   - Confirm that auth/profile pages are excluded

## Expected Results 🟩

When properly configured, you should see:

- ✅ `/robots.txt` responds with HTTP 200 and correct rules
- ✅ `/sitemap.xml` responds with HTTP 200 and valid XML
- ✅ Google Search Console shows no errors for sitemap
- ✅ Public pages (`/en`, `/es`) appear in search results
- ✅ Private pages (login, profile, API) are not indexed
- ✅ No "missing sitemap" warnings in Search Console
- ✅ No "blocked by robots.txt" errors for public pages

## Next.js Standards Compliance

Both files follow Next.js 13+ App Router conventions:

- ✅ Use `MetadataRoute` types from `next`
- ✅ Implement default export functions
- ✅ Generate dynamic content based on application routes
- ✅ Support environment-based configuration
- ✅ Follow [Next.js Metadata Files documentation](https://nextjs.org/docs/app/api-reference/file-conventions/metadata)

## Maintenance

### Adding New Public Routes

To add new public routes to the sitemap:

1. Open `/src/app/sitemap.ts`
2. Add new entries to the routes array:
   ```typescript
   locales.forEach((locale) => {
     routes.push({
       url: `${baseUrl}/${locale}/your-new-route`,
       lastModified: now,
       changeFrequency: 'weekly',
       priority: 0.8, // Adjust priority as needed
     });
   });
   ```

### Blocking New Routes from Crawlers

To block new routes from being crawled:

1. Open `/src/app/robots.ts`
2. Add new patterns to the `disallow` array:
   ```typescript
   disallow: [
     // ... existing rules
     '/your-route-to-block',
   ],
   ```

## SEO Best Practices

- **Priority Values:**
  - 1.0: Homepage and main landing pages
  - 0.8: Important secondary pages
  - 0.5: Regular content pages
  - 0.3: Less important pages

- **Change Frequency:**
  - `always`: For pages that change on every request
  - `hourly`: For frequently updated content
  - `daily`: For news/blog content
  - `weekly`: For regular content updates (used for landing pages)
  - `monthly`: For stable content
  - `yearly`: For archived/static content
  - `never`: For permanent content

## Troubleshooting

### Robots.txt not accessible

1. Verify file is at `/src/app/robots.ts` (not `/src/app/robots.txt`)
2. Check that the function exports a default function returning `MetadataRoute.Robots`
3. Clear Next.js cache: `rm -rf .next && pnpm dev`

### Sitemap.xml not accessible

1. Verify file is at `/src/app/sitemap.ts` (not `/src/app/sitemap.xml`)
2. Check that the function exports a default function returning `MetadataRoute.Sitemap`
3. Clear Next.js cache: `rm -rf .next && pnpm dev`

### Wrong domain in production

1. Ensure `NEXT_PUBLIC_SITE_URL` is set in your deployment environment
2. Redeploy the application after adding the environment variable
3. Verify with: `curl https://your-domain.com/robots.txt`

## References

- [Next.js Robots.txt Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
- [Next.js Sitemap Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Google Search Console](https://search.google.com/search-console)
- [Sitemaps.org Protocol](https://www.sitemaps.org/protocol.html)

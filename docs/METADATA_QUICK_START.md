# Metadata Quick Start Guide

## 🚀 Quick Reference

### Validate Metadata Setup
```bash
pnpm validate:metadata
```

### Test in Development
```bash
pnpm dev
# Visit http://localhost:3000
# View source and check <head> section
```

### Check Social Previews
```bash
# After deploying to production
# Facebook/Meta
https://developers.facebook.com/tools/debug/?q=YOUR_URL

# Twitter
https://cards-dev.twitter.com/validator

# LinkedIn
https://www.linkedin.com/post-inspector/
```

## 📦 Required Assets (Priority Order)

### 1. OG Image (Critical)
**File**: `/public/brand/briki-og-image.png`
- Size: 1200x630px
- Include: Logo + "Tu Compañero de Seguros Inteligente"
- Format: PNG or JPG
- Max size: ~500KB

**Quick Create**:
```bash
# Using Canva (recommended)
1. Create 1200x630px design
2. Add Briki logo centered
3. Add tagline below
4. Export as PNG
5. Save to /public/brand/briki-og-image.png

# Using existing logo (basic)
convert brand/briki-logo-2.png -resize 600x \
  -background white -gravity center \
  -extent 1200x630 \
  public/brand/briki-og-image.png
```

### 2. Favicons
Use https://realfavicongenerator.net/:
1. Upload `brand/briki-logo-2.png`
2. Adjust settings for each platform
3. Generate
4. Download package
5. Extract to `/public/`

**Required files**:
- `favicon.ico` (32x32)
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png` (180x180)
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`

## 🔧 Environment Variables

Create `.env.local`:
```bash
# Production URL (required for production)
NEXT_PUBLIC_SITE_URL=https://briki.com

# Google Search Console (optional, add after verification)
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your-verification-code
```

## ✅ Validation Checklist

Run validation:
```bash
pnpm validate:metadata
```

### Success Indicators:
- ✅ All required assets exist
- ✅ Environment variables set
- ✅ No linting errors
- ✅ Build succeeds

### After Production Deploy:
1. Test social previews on all platforms
2. Run Lighthouse audit (target: SEO ≥95)
3. Validate structured data
4. Submit sitemap to Google Search Console

## 🎯 Success Metrics

### SEO Score
- Target: ≥95/100
- Run: `npx lighthouse https://briki.com --view`

### Social Previews
- Image displays on Facebook ✅
- Image displays on Twitter ✅
- Image displays on LinkedIn ✅
- Title and description correct ✅

### Technical
- Structured data validates ✅
- No console errors ✅
- Sitemap accessible ✅
- Robots.txt accessible ✅

## 🔄 Using Metadata in Other Pages

### Dynamic Page Metadata
```typescript
// app/[locale]/blog/page.tsx
import { generatePageMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  
  return generatePageMetadata({
    title: "Blog",
    description: "Read our latest articles",
    path: `/${locale}/blog`,
    locale,
  });
}
```

### Article Metadata
```typescript
// app/[locale]/blog/[slug]/page.tsx
import { generateArticleMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const post = await getPost(slug);
  
  return generateArticleMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/${locale}/blog/${slug}`,
    publishedTime: post.createdAt,
    author: post.author,
    tags: post.tags,
    locale,
  });
}
```

## 📚 Documentation

- Full guide: `docs/SEO_ASSETS_GUIDE.md`
- Implementation summary: `docs/SEO_IMPLEMENTATION_SUMMARY.md`
- Validation script: `scripts/validate-metadata.ts`

## 🐛 Troubleshooting

### OG Image Not Showing
1. Check file exists: `ls -la public/brand/briki-og-image.png`
2. Verify dimensions: 1200x630px
3. Clear cache on social platforms
4. Wait 5-10 minutes after updating

### Favicon Not Updating
1. Clear browser cache: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
2. Check browser console for 404 errors
3. Verify file paths in `layout.tsx`

### Metadata Not Showing in Source
1. View page source (not inspect element)
2. Check for errors in `layout.tsx`
3. Rebuild: `pnpm build`
4. Restart dev server

### Validation Script Failing
```bash
# Check Node/TypeScript installation
node --version
tsx --version

# Reinstall if needed
pnpm install

# Run with verbose output
tsx scripts/validate-metadata.ts 2>&1
```

## 💡 Pro Tips

1. **Test Early**: Use https://metatags.io/ to preview before deploying
2. **Cache Busting**: Add `?v=2` to image URLs when updating
3. **Image Optimization**: Use https://squoosh.app/ to compress images
4. **Monitor**: Set up Google Search Console alerts
5. **Track**: Use UTM parameters for social sharing analytics

## 🎨 Design Resources

### OG Image Templates
- Canva: https://www.canva.com/templates/s/og-image/
- Figma: Search "Open Graph template"
- Generated: https://og-image.xyz/

### Icon Tools
- Favicon Generator: https://realfavicongenerator.net/
- SVG Optimizer: https://jakearchibald.github.io/svgomg/
- Image Compressor: https://squoosh.app/

## 📊 Analytics Integration

After setup, consider adding:
- Google Analytics 4
- Google Tag Manager
- Facebook Pixel (for ad tracking)
- Twitter Analytics

See Next.js docs for third-party script optimization.

---

**Need Help?** Check the full documentation or run `pnpm validate:metadata` for detailed status.

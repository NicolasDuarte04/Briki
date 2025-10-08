# SEO & Social Media Assets Guide

This document outlines all the required assets for optimal SEO and social media previews.

## ✅ Already Implemented

The `layout.tsx` has been enhanced with comprehensive metadata including:
- Open Graph tags for social sharing
- Twitter Card configuration
- Structured data (JSON-LD)
- Canonical URLs
- Language alternatives
- PWA manifest support
- Viewport configuration

## 🎨 Required Image Assets

### Favicons & Icons

Create these files in `/public/`:

1. **favicon.ico** (32x32 or 16x16)
   - Legacy favicon for older browsers

2. **favicon-16x16.png** (16x16)
   - Small favicon for bookmarks

3. **favicon-32x32.png** (32x32)
   - Standard favicon

4. **apple-touch-icon.png** (180x180)
   - iOS home screen icon
   - Should have rounded corners (iOS applies the mask)

5. **safari-pinned-tab.svg**
   - Monochrome SVG icon for Safari pinned tabs

### Android/PWA Icons

6. **android-chrome-192x192.png** (192x192)
   - Android home screen icon (small)

7. **android-chrome-512x512.png** (512x512)
   - Android home screen icon (large)
   - Also used for splash screens

### Social Media Preview

8. **briki-og-image.png** (1200x630)
   - Location: `/public/brand/briki-og-image.png`
   - Used for Open Graph and Twitter Cards
   - Design should include:
     - Briki logo
     - Tagline: "Tu Compañero de Seguros Inteligente"
     - Attractive background
     - High contrast text for readability
   - Format: PNG or JPG
   - Size: Exactly 1200x630px (2:1 aspect ratio)

### Optional Screenshots (for PWA)

9. **screenshots/desktop-1.png** (1280x720)
   - Desktop view of the app

10. **screenshots/mobile-1.png** (750x1334)
    - Mobile view of the app

### Shortcut Icons (Optional)

11. **icons/chat-shortcut.png** (96x96)
    - Icon for chat shortcut

12. **icons/policies-shortcut.png** (96x96)
    - Icon for policies shortcut

## 🔧 Tools for Creating Assets

### Favicon Generators
- [RealFaviconGenerator](https://realfavicongenerator.net/) - Comprehensive favicon generator
- [Favicon.io](https://favicon.io/) - Simple favicon generator

### OG Image Generators
- [Canva](https://www.canva.com/) - Design OG images from templates
- [Figma](https://www.figma.com/) - Design custom OG images
- [OG Image Playground](https://og-playground.vercel.app/) - Code-based OG images

### Icon Tools
- [SVGOMG](https://jakearchibald.github.io/svgomg/) - Optimize SVG icons
- [Squoosh](https://squoosh.app/) - Optimize PNG/JPG images

## 📦 Quick Setup

### Using Source Logo

If you have a source logo file, use one of these services to generate all sizes:

```bash
# Install imagemagick for command-line generation
brew install imagemagick

# Generate favicons from source logo
convert brand/briki-logo-2.png -resize 16x16 public/favicon-16x16.png
convert brand/briki-logo-2.png -resize 32x32 public/favicon-32x32.png
convert brand/briki-logo-2.png -resize 180x180 public/apple-touch-icon.png
convert brand/briki-logo-2.png -resize 192x192 public/android-chrome-192x192.png
convert brand/briki-logo-2.png -resize 512x512 public/android-chrome-512x512.png

# For OG image, create a 1200x630 canvas with logo centered
convert -size 1200x630 xc:white \
  brand/briki-logo-2.png -resize 600x \
  -gravity center -composite \
  public/brand/briki-og-image.png
```

## 🌐 Environment Variables

Add these to your `.env.local`:

```bash
# Site Configuration
NEXT_PUBLIC_SITE_URL=https://briki.com
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your-google-verification-code

# Social Media
NEXT_PUBLIC_TWITTER_HANDLE=@BrikiApp
```

## ✅ Testing & Validation

### Social Media Preview Testing

1. **Facebook/Meta Debugger**
   - URL: https://developers.facebook.com/tools/debug/
   - Test Open Graph tags

2. **Twitter Card Validator**
   - URL: https://cards-dev.twitter.com/validator
   - Test Twitter Card tags

3. **LinkedIn Post Inspector**
   - URL: https://www.linkedin.com/post-inspector/
   - Test LinkedIn previews

### SEO Testing

1. **Google Rich Results Test**
   - URL: https://search.google.com/test/rich-results
   - Validate structured data

2. **Lighthouse**
   ```bash
   # Run Lighthouse audit
   npx lighthouse https://your-site.com --view
   ```

3. **Web.dev Measure**
   - URL: https://web.dev/measure/
   - Comprehensive SEO audit

### Metadata Validation

```bash
# Check metadata in production
curl -I https://your-site.com | grep -i "x-"
```

## 📊 Success Metrics

- ✅ SEO score ≥ 95 in Lighthouse
- ✅ All social previews display correctly (Facebook, Twitter, LinkedIn)
- ✅ No metadata warnings in browser console
- ✅ Structured data validates without errors
- ✅ PWA installable (if desired)
- ✅ Fast Time to First Byte (TTFB < 200ms)

## 🔄 Maintenance

- Update OG image when brand changes
- Update description if product offering changes
- Keep social media handles current
- Monitor Core Web Vitals in Google Search Console
- Test previews after major updates

## 📚 Resources

- [Next.js Metadata Docs](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Schema.org](https://schema.org/)
- [Web.dev SEO Guide](https://web.dev/lighthouse-seo/)

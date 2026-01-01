# Warm Accent CTA Implementation

## Overview

This document describes the implementation of warm accent colors for marketing CTAs, inspired by Cursor's design approach. The warm accent (amber/orange) provides visual hierarchy and contrast against Briki's cool-toned, dark landing page without overwhelming the primary blue brand.

## Design Principles

### Color Strategy
- **Primary brand color**: Blue (`--briki-primary`) - remains dominant for product buttons and core actions
- **Warm accent**: Amber/Orange (`--briki-accent-warm`) - used sparingly for marketing CTAs only
- **Purpose**: Create visual hierarchy and guide attention without brand takeover

### Usage Guidelines

#### ✅ DO use warm accent for:
- "Learn more" text links
- Feature card CTAs
- Secondary marketing actions
- Footer navigation links (on hover)
- Marketing page text CTAs

#### ❌ DON'T use warm accent for:
- Product primary buttons (keep blue)
- Status chips or badges
- Navigation active states
- Error/warning states
- Product UI elements

## Implementation Details

### 1. CSS Variables

Added to `src/app/globals.css`:

#### Dark Theme (Primary)
```css
--briki-accent-warm: #E5A45E;        /* Base warm accent */
--briki-accent-warm-hover: #EDB574;  /* Hover state (brighter) */
--briki-accent-warm-active: #D99448; /* Active state (darker) */
```

#### Light Theme
```css
--briki-accent-warm: #D97706;        /* Base warm accent */
--briki-accent-warm-hover: #EA580C;  /* Hover state */
--briki-accent-warm-active: #C2410C; /* Active state */
```

**Color Selection Rationale:**
- Slightly desaturated (not neon)
- Not too red (avoids "error" association)
- Not too yellow (avoids "warning" association)
- Readable on dark backgrounds
- Complements blue without competing

### 2. Tailwind Configuration

Updated `tailwind.config.ts` to expose tokens:

```typescript
colors: {
  // ... existing colors
  "briki-accent-warm": "var(--briki-accent-warm)",
  "briki-accent-warm-hover": "var(--briki-accent-warm-hover)",
  "briki-accent-warm-active": "var(--briki-accent-warm-active)",
}
```

### 3. MarketingLink Component

Created `src/components/Landing/MarketingLink.tsx` - a reusable component for marketing CTAs.

**Features:**
- Warm accent text color
- Subtle arrow icon (optional)
- Medium font weight (not bold)
- Hover: brightens + underline
- Active state support
- Support for internal (Next.js Link) and external links

**Props:**
```typescript
interface MarketingLinkProps {
  href: string;
  children: React.ReactNode;
  showArrow?: boolean;      // Default: true
  className?: string;
  external?: boolean;        // Default: false
}
```

**Example Usage:**
```tsx
<MarketingLink href="#features">
  Learn more
</MarketingLink>

<MarketingLink href="https://docs.briki.com" external>
  View documentation
</MarketingLink>
```

### 4. Applied Changes

#### LandingDemoWide.tsx
- Replaced inline `<a>` tags with `<MarketingLink>` component
- "Learn more" links now use warm accent
- Maintains consistent styling across demo sections

#### LandingCTA.tsx
- Contact form demo link uses `<MarketingLink>`
- Consistent with other marketing CTAs

#### LandingFooter.tsx
- Footer navigation links use warm accent on hover
- Social links (LinkedIn, X, YouTube) use warm accent on hover
- Changed from opacity transition to color transition

## Visual QA Checklist

Compare against Cursor's implementation:

- [ ] Orange feels like a "hint" that guides attention
- [ ] Not a brand takeover - blue remains primary
- [ ] Warm accent is restrained and professional
- [ ] Hover states are smooth and subtle
- [ ] Arrow icons animate on hover
- [ ] Underlines appear on hover with proper offset
- [ ] Color is readable on dark background
- [ ] Contrast meets WCAG AA standards
- [ ] Product buttons remain blue (unchanged)
- [ ] Status indicators remain unchanged

## Accessibility

- **Contrast Ratio**: Warm accent meets WCAG AA standards (4.5:1+) on dark backgrounds
- **Focus States**: Inherit from global focus styles (ring + outline)
- **Hover States**: Visual feedback through color change + underline
- **Active States**: Darker shade provides tactile feedback
- **Arrow Icons**: Marked with `aria-hidden="true"` (decorative)

## Performance

- **No JavaScript required**: Pure CSS transitions
- **Minimal bundle impact**: Single small component (~2KB)
- **No external dependencies**: Uses existing Lucide icons
- **Optimized transitions**: GPU-accelerated transform + color changes

## Future Considerations

### Potential Extensions
1. **Marketing Button Variant**: Create a warm accent button variant for specific marketing contexts
2. **Gradient Accents**: Subtle warm-to-cool gradients for premium features
3. **Animation Library**: Add micro-interactions for marketing CTAs
4. **A/B Testing**: Test warm vs. cool CTAs for conversion optimization

### Maintenance
- Review color contrast if background colors change
- Update hover states if interaction patterns evolve
- Monitor analytics for CTA performance
- Gather user feedback on visual hierarchy

## Related Files

- `src/app/globals.css` - CSS variable definitions
- `tailwind.config.ts` - Tailwind color token configuration
- `src/components/Landing/MarketingLink.tsx` - Reusable CTA component
- `src/components/Landing/LandingDemoWide.tsx` - Demo section CTAs
- `src/components/Landing/LandingCTA.tsx` - Contact form CTA
- `src/components/Landing/LandingFooter.tsx` - Footer navigation

## References

- [Cursor Landing Page](https://cursor.sh) - Design inspiration
- [WCAG 2.1 Color Contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Tailwind CSS Custom Colors](https://tailwindcss.com/docs/customizing-colors)

---

**Last Updated**: December 31, 2025  
**Author**: Briki Design System Team


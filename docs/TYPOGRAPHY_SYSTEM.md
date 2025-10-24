# Typography System

## Font Families

### DM Sans (`font-display`)
**Usage:** Hero headlines, display text only  
**Weights:** 400, 500, 600, 700  
**Rationale:** Calm, confident, highly readable at large sizes. Soft curves avoid aggressive look.

**Apply with:**
```tsx
className="font-display"
```

**Current usage:**
- Landing hero H1
- (Future) Marketing headlines

### Inter (`font-sans`, default)
**Usage:** Body text, UI elements, CTAs, forms  
**Rationale:** System-wide consistency, excellent readability at small sizes.

**Apply with:**
```tsx
className="font-sans"  // or just default
```

### Geist Mono (`font-mono`)
**Usage:** Code blocks, technical data  
**Rationale:** Developer tooling, monospace needs.

---

## Implementation Details

### Next.js Font Loading
```typescript
// src/app/layout.tsx
import { DM_Sans, Inter, Geist_Mono } from "next/font/google";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
});
```

### CSS Variables
```css
:root {
  --font-sans: var(--font-inter);
  --font-display: var(--font-dm-sans);
  --font-mono: var(--font-geist-mono);
}
```

### Tailwind Config
```typescript
fontFamily: {
  sans: ["var(--font-inter)", "system-ui", ...],
  display: ["var(--font-dm-sans)", "var(--font-inter)", ...],
  mono: ["var(--font-geist-mono)", ...],
}
```

---

## Performance Considerations

✅ **No layout shifts:** All fonts use `display: "swap"` + `adjustFontFallback: true`  
✅ **Preloaded:** Critical fonts preloaded for LCP  
✅ **Subset optimization:** Latin subset only reduces bundle size  
✅ **Fallback chain:** System fonts as fallbacks ensure text is always readable

---

## Acceptance Criteria

- [x] H1 uses DM Sans via `font-display`
- [x] CTAs and chat text remain Inter
- [x] No layout shifts on reload (Lighthouse passing)
- [x] Visual tone: softer curves, readable at large size, not shouty
- [x] Easy to extend: `font-display` utility available for future headlines

---

## Future Extensions

Consider `font-display` for:
- Marketing page section headings
- Product feature titles
- Testimonial names (if large)
- Hero subheadings (optional, test first)

**Rule:** Use `font-display` sparingly for hierarchy, keep `font-sans` as default.


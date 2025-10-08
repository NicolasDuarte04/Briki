<!-- a4e30c22-41cc-4903-909a-1b4ddb6df4f2 d90238c5-8ecd-4ef5-a02d-e337b3765d1d -->
# Soften Landing Page Design

## Goal

Transform the landing hero from "aggressive tech" to "quiet confidence" — professional, modern, and welcoming like Linear, Notion, or Intercom.

## Key Changes

### 1. Background & Visual Foundation

**File: `src/app/globals.css`** (lines 291-338)

Current state: Dark dramatic abstract with sharp lines and high contrast

- Replace `.landing-hero` background with softer, lighter approach:
- Use lighter base tones (soft slate/blue-gray instead of dark abstract)
- Add subtle, soft gradient overlays (blues with low saturation)
- Consider lighter alternative background image or blur/lighten current one

- Update `.landing-hero-fade` and `.landing-hero-vignette`:
- Reduce overlay darkness (currently uses dark rgba values)
- Use gentler gradient transitions
- Add more luminosity to create airier feel

**Approach:** Create gentler visual foundation with soft blues, lighter tones, and transparent layering instead of dark moody background.

### 2. Typography Weight & Scale

**File: `src/components/Landing/LandingHero.tsx`** (line 28)

Current: `font-extrabold` (800 weight) on main heading

- Reduce to `font-bold` (700) or `font-semibold` (600)
- Consider slightly reducing scale if still feels too heavy
- Adjust letter-spacing to be less aggressive

**File: `tailwind.config.ts`** (lines 15-18)

- Review `text-display-xl` definition if scale adjustment needed
- Ensure line-height creates breathing room

### 3. Color & Contrast Adjustments

**File: `src/components/Landing/LandingHero.tsx`** (lines 28-32)

Current: Pure white text (`text-white`) on dark background

- Replace with softer neutrals:
- Heading: Use `slate-900` or `slate-800` on lighter background, OR
- If keeping darker bg: Use `slate-50` / `blue-50` instead of pure white
- Reduce opacity on subhead text to create hierarchy without harshness
- Ensure WCAG AA compliance (4.5:1 contrast ratio)

**File: `src/app/globals.css`**

- Update CSS custom properties if needed for softer brand colors:
- `--briki-text` could shift from `#0F172A` to slightly softer tone
- Consider adding `--briki-text-soft` variant

### 4. Button & CTA Softening

**File: `src/components/Landing/LandingHero.tsx`** (lines 35-50)

Current: Stark white button with black text

- Soften button styling:
- Reduce shadow intensity (`shadow-button`)
- Consider gentler border-radius or subtle border
- Use softer transition effects

### 5. Overall Spacing & Breathing Room

**File: `src/components/Landing/LandingHero.tsx`**

- Review spacing utilities to add more white space
- Ensure generous padding creates calm, uncluttered feel
- Check that elements have room to breathe

## Visual Principles Applied

- **Luminosity over darkness:** Lighter base tones with soft overlays
- **Subtle over bold:** Reduced font weights, gentler contrasts
- **Layered transparency:** Soft gradients instead of hard overlays
- **Breathing room:** More space, less visual density
- **Gentle hierarchy:** Created through spacing and subtle weight differences, not extreme contrast

## Files to Modify

1. `src/app/globals.css` - Background styles and color variables
2. `src/components/Landing/LandingHero.tsx` - Typography and text colors
3. `tailwind.config.ts` - Font scale adjustments (if needed)

## Testing Checklist

- [ ] Text remains readable (WCAG AA: 4.5:1 contrast)
- [ ] Design feels modern but approachable
- [ ] Brand identity (blue tones) preserved
- [ ] Visual hierarchy clear without harshness
- [ ] Responsive behavior maintained across breakpoints

### To-dos

- [ ] Update landing hero background styles to use lighter tones, softer gradients, and reduced overlay darkness
- [ ] Change heading from font-extrabold to font-bold or font-semibold, adjust letter-spacing
- [ ] Replace pure white text with softer neutrals (slate-50, blue-50) and reduce subhead opacity
- [ ] Reduce button shadow intensity and add gentler styling
- [ ] Review and enhance spacing throughout hero section for more white space
- [ ] Test contrast ratios and ensure WCAG AA compliance maintained
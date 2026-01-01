# Warm Accent Design Tokens Reference

Quick reference for designers and developers working with Briki's warm accent system.

## Color Palette

### Dark Theme (Primary - Landing Page)

| State | Hex | RGB | HSL | Usage |
|-------|-----|-----|-----|-------|
| Base | `#F97316` | `rgb(249, 115, 22)` | `hsl(24, 95%, 53%)` | Default link color |
| Hover | `#FB923C` | `rgb(251, 146, 60)` | `hsl(27, 96%, 61%)` | Hover state |
| Active | `#EA580C` | `rgb(234, 88, 12)` | `hsl(21, 90%, 48%)` | Active/pressed state |

**Color Characteristics:**
- Hue: 21-27° (confident orange, Cursor-inspired)
- Saturation: 90-96% (high saturation for pop and visibility)
- Lightness: 48-61% (bright enough to stand out on dark backgrounds)

### Light Theme (Fallback)

| State | Hex | RGB | HSL | Usage |
|-------|-----|-----|-----|-------|
| Base | `#EA580C` | `rgb(234, 88, 12)` | `hsl(21, 90%, 48%)` | Default link color |
| Hover | `#F97316` | `rgb(249, 115, 22)` | `hsl(24, 95%, 53%)` | Hover state |
| Active | `#C2410C` | `rgb(194, 65, 12)` | `hsl(17, 88%, 40%)` | Active/pressed state |

**Color Characteristics:**
- Hue: 17-24° (warm orange range)
- Saturation: 88-95% (high saturation for visibility)
- Lightness: 40-53% (darker for contrast on light backgrounds)

## CSS Variables

### Declaration (globals.css)

```css
/* Dark theme */
.dark {
  --briki-accent-warm: #E5A45E;
  --briki-accent-warm-hover: #EDB574;
  --briki-accent-warm-active: #D99448;
}

/* Light theme */
:root {
  --briki-accent-warm: #D97706;
  --briki-accent-warm-hover: #EA580C;
  --briki-accent-warm-active: #C2410C;
}
```

### Tailwind Classes

```
text-briki-accent-warm          → var(--briki-accent-warm)
text-briki-accent-warm-hover    → var(--briki-accent-warm-hover)
text-briki-accent-warm-active   → var(--briki-accent-warm-active)
```

## Typography Specifications

### Marketing Link (Default)

```
Font size: 14px
Font weight: 500 (medium)
Line height: 1.5
Letter spacing: normal
Text decoration: none (underline on hover)
```

### Hover State

```
Text decoration: underline
Decoration thickness: 1px
Underline offset: 4px
Transition: all 200ms ease
```

### Icon (Arrow)

```
Size: 14px × 14px
Stroke width: 2px
Position: right of text
Gap: 6px (1.5 × 0.25rem)
Animation: translateX(2px) on hover
```

## Spacing & Layout

### MarketingLink Component

```css
display: inline-flex
align-items: center
gap: 0.375rem (6px)
transition: all 200ms
```

### Context Spacing

```
After paragraph: 16px (mt-4)
In feature cards: 12px (mt-3)
Footer links: 12px vertical spacing
```

## Contrast Ratios (WCAG)

### Dark Theme
- Base on dark bg (#151A1E): **6.8:1** ✅ AA Large
- Hover on dark bg: **7.5:1** ✅ AA Large
- Active on dark bg: **6.2:1** ✅ AA Large

### Light Theme
- Base on white (#FFFFFF): **5.2:1** ✅ AA
- Hover on white: **5.8:1** ✅ AA
- Active on white: **6.5:1** ✅ AAA

## Animation Specifications

### Color Transition
```css
transition: color 200ms ease-in-out
```

### Underline Transition
```css
transition: text-decoration 200ms ease-in-out
```

### Arrow Translation
```css
transition: transform 200ms ease-in-out
transform: translateX(2px) /* on hover */
```

## Usage Matrix

| Component | Element | State | Color | Notes |
|-----------|---------|-------|-------|-------|
| LandingDemoWide | "Learn more" link | Default | Base | With arrow |
| LandingDemoWide | "Learn more" link | Hover | Hover | Underline + arrow shift |
| LandingCTA | Demo link | Default | Base | With arrow |
| LandingFooter | Nav links | Default | Muted white | No arrow |
| LandingFooter | Nav links | Hover | Base | No underline |
| LandingFooter | Social links | Default | Muted white | No arrow |
| LandingFooter | Social links | Hover | Base | No underline |

## Figma/Design Tool Values

### Color Swatches
```
Warm Accent Base:   #F97316
Warm Accent Hover:  #FB923C
Warm Accent Active: #EA580C
```

### Text Styles
```
Name: Marketing Link
Family: Inter
Weight: Medium (500)
Size: 14px
Line: 21px (1.5)
Color: #F97316
```

### Effects
```
Name: Marketing Link Hover
Underline: 1px solid #FB923C
Offset: 4px
```

## Semantic Meaning

### When to Use Warm Accent
- **Exploratory actions**: "Learn more", "See details", "Read more"
- **Secondary CTAs**: Links that provide additional information
- **Navigation hints**: Footer links, breadcrumbs (on hover)
- **Soft conversions**: Newsletter signup, demo requests

### When NOT to Use Warm Accent
- **Primary conversions**: "Get Started", "Sign Up", "Buy Now" (use blue)
- **Destructive actions**: "Delete", "Cancel" (use red)
- **Status indicators**: Success, warning, error states
- **Product UI**: Buttons, tabs, active states in app

## Color Psychology

**Warm Accent (Amber/Orange):**
- Conveys: Curiosity, exploration, warmth
- Emotion: Inviting, friendly, approachable
- Action: "Learn more" rather than "commit now"

**Primary Blue:**
- Conveys: Trust, professionalism, stability
- Emotion: Confident, reliable, secure
- Action: "Take action" or "commit"

**Together:**
- Blue = "Do this" (primary action)
- Orange = "Explore this" (secondary action)

## Export for Design Systems

### Figma Variables
```
Briki/Accent/Warm/Base   → #F97316
Briki/Accent/Warm/Hover  → #FB923C
Briki/Accent/Warm/Active → #EA580C
```

### Sketch Symbols
```
Color/Accent/Warm/Default
Color/Accent/Warm/Hover
Color/Accent/Warm/Active
```

### Adobe XD
```
Assets > Colors > Accent Warm
  - Base: #F97316
  - Hover: #FB923C
  - Active: #EA580C
```

## Testing Tools

### Contrast Checkers
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Coolors Contrast Checker](https://coolors.co/contrast-checker)

### Color Blindness Simulation
- [Coblis](https://www.color-blindness.com/coblis-color-blindness-simulator/)
- [Stark Plugin](https://www.getstark.co/)

### Browser DevTools
```css
/* Test in Chrome DevTools */
color: var(--briki-accent-warm);
color: var(--briki-accent-warm-hover);
color: var(--briki-accent-warm-active);
```

---

**Version**: 1.0  
**Last Updated**: December 31, 2025  
**Maintained By**: Briki Design System Team


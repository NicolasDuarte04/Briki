# Design System Quick Reference

## 🎨 Color Tokens - Copy & Paste Ready

### Status Pills Pattern

```tsx
// ✅ Success (Activo)
<span
  className="px-1.5 py-0.5 rounded text-[10px] font-normal"
  style={{
    backgroundColor: 'var(--briki-success-surface)',
    color: 'var(--briki-success)',
    border: '1px solid var(--briki-success-border)',
  }}
>
  Activo
</span>

// ⚠️ Warning (Pendiente)
<span
  className="px-1.5 py-0.5 rounded text-[10px] font-normal"
  style={{
    backgroundColor: 'var(--briki-warning-surface)',
    color: 'var(--briki-warning)',
    border: '1px solid var(--briki-warning-border)',
  }}
>
  Pendiente
</span>

// ℹ️ Info (En revisión)
<span
  className="px-1.5 py-0.5 rounded text-[10px] font-normal"
  style={{
    backgroundColor: 'var(--briki-info-surface)',
    color: 'var(--briki-info)',
    border: '1px solid var(--briki-info-border)',
  }}
>
  En revisión
</span>
```

### Button Patterns

```tsx
// Primary CTA (solid fill - the ONE exception)
<button
  className="rounded-md px-3 py-2 text-[13px] font-medium transition-all"
  style={{
    backgroundColor: 'var(--briki-primary)',
    color: 'var(--briki-primary-foreground)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-1px)';
    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.15)';
  }}
>
  Primary Action
</button>

// Secondary Button (surface + border)
<button
  className="rounded-md px-3 py-2 text-[13px] font-normal transition-colors"
  style={{
    backgroundColor: 'var(--briki-surface-1)',
    color: 'var(--briki-text-muted)',
    border: '1px solid var(--briki-border-subtle)',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = 'var(--briki-surface-2)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = 'var(--briki-surface-1)';
  }}
>
  Secondary Action
</button>
```

### Navigation / Tab Patterns

```tsx
// Active tab/nav item
<button
  className="px-2.5 py-1 rounded-md text-[11px] font-normal"
  style={{
    backgroundColor: 'var(--briki-primary-surface)',
    color: 'var(--briki-primary)',
    border: '1px solid var(--briki-primary-border)',
  }}
>
  Activos
</button>

// Inactive tab/nav item
<button
  className="px-2.5 py-1 rounded-md text-[11px] font-normal transition-colors"
  style={{
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    color: 'var(--briki-text-muted)',
    border: '1px solid var(--briki-border-subtle)',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
  }}
>
  Pendientes
</button>
```

### Card / List Item Patterns

```tsx
// Selected card/list item
<div
  className="rounded-md transition-all"
  style={{
    backgroundColor: 'var(--briki-primary-surface)',
    border: '1px solid var(--briki-primary-border)',
  }}
>
  Selected Item Content
</div>

// Unselected card/list item
<div
  className="rounded-md transition-all"
  style={{
    backgroundColor: 'var(--briki-surface-1)',
    border: '1px solid var(--briki-border-subtle)',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = 'var(--briki-surface-2)';
    e.currentTarget.style.borderColor = 'var(--briki-border)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = 'var(--briki-surface-1)';
    e.currentTarget.style.borderColor = 'var(--briki-border-subtle)';
  }}
>
  Unselected Item Content
</div>
```

## 🎯 CSS Custom Properties Reference

### Base Colors

```css
var(--briki-bg)              /* #151A1E - Main background */
var(--briki-surface-1)       /* #1B2127 - Elevated surface */
var(--briki-surface-2)       /* #202831 - Higher elevation */
```

### Borders

```css
var(--briki-border)          /* rgba(255,255,255,0.08) - Standard border */
var(--briki-border-subtle)   /* rgba(255,255,255,0.06) - Subtle border */
```

### Text Colors

```css
var(--briki-text)            /* rgba(255,255,255,0.92) - Primary text */
var(--briki-text-muted)      /* rgba(255,255,255,0.62) - Secondary text */
var(--briki-text-subtle)     /* rgba(255,255,255,0.45) - Tertiary text */
```

### Primary Accent

```css
var(--briki-primary)         /* #5B8FCC - Full primary color */
var(--briki-primary-surface) /* rgba(91,143,204,0.10) - 10% tint */
var(--briki-primary-border)  /* rgba(91,143,204,0.18) - 18% border */
var(--briki-primary-foreground) /* rgba(255,255,255,0.95) - Text on primary */
```

### Success Accent

```css
var(--briki-success)         /* #4FA892 */
var(--briki-success-surface) /* rgba(79,168,146,0.10) */
var(--briki-success-border)  /* rgba(79,168,146,0.18) */
var(--briki-success-foreground) /* rgba(255,255,255,0.95) */
```

### Warning Accent

```css
var(--briki-warning)         /* #D4A053 */
var(--briki-warning-surface) /* rgba(212,160,83,0.10) */
var(--briki-warning-border)  /* rgba(212,160,83,0.18) */
var(--briki-warning-foreground) /* rgba(255,255,255,0.95) */
```

### Info Accent

```css
var(--briki-info)            /* #6B8CA8 */
var(--briki-info-surface)    /* rgba(107,140,168,0.10) */
var(--briki-info-border)     /* rgba(107,140,168,0.18) */
var(--briki-info-foreground) /* rgba(255,255,255,0.95) */
```

## 📏 The Golden Rule

**80% Rule for Premium UI:**

> Chips/tags/pills: `accent-surface (10%) + accent-border (18%) + text (90%)`  
> **Only the main CTA uses solid primary.**

## 🚫 Anti-Patterns to Avoid

```tsx
// ❌ DON'T: Bright saturated backgrounds
<span className="bg-blue-500 text-white">Activo</span>

// ✅ DO: Subtle tinted surface + border
<span style={{
  backgroundColor: 'var(--briki-primary-surface)',
  color: 'var(--briki-primary)',
  border: '1px solid var(--briki-primary-border)',
}}>Activo</span>

// ❌ DON'T: Multiple bright CTAs
<button className="bg-blue-500">Action 1</button>
<button className="bg-green-500">Action 2</button>

// ✅ DO: One solid primary, rest are surface-based
<button style={{ backgroundColor: 'var(--briki-primary)' }}>Primary</button>
<button style={{ backgroundColor: 'var(--briki-surface-1)' }}>Secondary</button>

// ❌ DON'T: Hardcoded arbitrary colors
<div className="bg-[#3B82F6]/10 text-[#60A5FA] border border-[#3B82F6]/20">

// ✅ DO: Semantic tokens
<div style={{
  backgroundColor: 'var(--briki-primary-surface)',
  color: 'var(--briki-primary)',
  border: '1px solid var(--briki-primary-border)',
}}>
```

## 🎨 Tailwind Utility Classes

All tokens are available as Tailwind classes:

```tsx
// Backgrounds
bg-briki-bg
bg-briki-surface-1
bg-briki-surface-2

// Borders
border-briki-border
border-briki-border-subtle

// Text
text-briki-text
text-briki-text-muted
text-briki-text-subtle

// Primary
bg-briki-primary
bg-briki-primary-surface
text-briki-primary
border-briki-primary-border

// Success
bg-briki-success
bg-briki-success-surface
text-briki-success
border-briki-success-border

// Warning
bg-briki-warning
bg-briki-warning-surface
text-briki-warning
border-briki-warning-border

// Info
bg-briki-info
bg-briki-info-surface
text-briki-info
border-briki-info-border
```

**Example:**

```tsx
<span className="bg-briki-success-surface text-briki-success border border-briki-success-border px-1.5 py-0.5 rounded text-[10px]">
  Activo
</span>
```

## 🔄 Badge Component Variants

Use the updated Badge component with semantic variants:

```tsx
import { Badge } from '@/components/ui/badge';

// Success variant
<Badge variant="success">Activo</Badge>

// Warning variant
<Badge variant="warning">Pendiente</Badge>

// Info variant
<Badge variant="info">En revisión</Badge>

// Primary variant (default)
<Badge>Primary</Badge>
```

## 📊 Visual Hierarchy

```
Solid Primary Button (brightest)
    ↓ Less prominent
Active States / Selected Items (tinted surface)
    ↓ Less prominent
Status Pills / Badges (tinted surface)
    ↓ Less prominent
Inactive Secondary Buttons (surface-1)
    ↓ Less prominent
Card Backgrounds (bg)
```

## 💡 Pro Tips

1. **One Solid Primary Per Screen**: Only the main CTA should use solid `bg-briki-primary`
2. **Surface Tints for Everything Else**: Use `*-surface` tokens for highlights
3. **Always Pair Surface + Border**: Never use tinted backgrounds without borders
4. **Text Hierarchy**: Use `text` > `text-muted` > `text-subtle` for visual hierarchy
5. **Hover States Should Be Subtle**: Small brightness/opacity changes, not color swaps
6. **Interactive Elements Need Feedback**: Use transform or opacity for hover states

## 🎯 Common Use Cases

### Search Input

```tsx
<input
  className="rounded-md pl-9 pr-3 py-1.5 text-[13px] transition-colors"
  style={{
    backgroundColor: 'var(--briki-surface-1)',
    border: '1px solid var(--briki-border-subtle)',
    color: 'var(--briki-text-muted)',
  }}
  onFocus={(e) => {
    e.currentTarget.style.borderColor = 'var(--briki-primary-border)';
    e.currentTarget.style.backgroundColor = 'var(--briki-surface-2)';
  }}
  onBlur={(e) => {
    e.currentTarget.style.borderColor = 'var(--briki-border-subtle)';
    e.currentTarget.style.backgroundColor = 'var(--briki-surface-1)';
  }}
/>
```

### Info Card

```tsx
<div
  className="rounded-md p-3.5"
  style={{
    backgroundColor: 'var(--briki-surface-1)',
    border: '1px solid var(--briki-border-subtle)',
  }}
>
  <div style={{ color: 'var(--briki-text-subtle)' }}>Label</div>
  <div style={{ color: 'var(--briki-text)' }}>Value</div>
</div>
```

### Divider

```tsx
<div style={{ borderTop: '1px solid var(--briki-border-subtle)' }} />
```

---

**Remember:** Premium UI is about restraint. Less is more. ✨





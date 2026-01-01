# Premium Design System - Cursor-like Dark UI

## Overview

This document describes the comprehensive design system upgrade that transforms Briki's landing page into a premium, Cursor-like dark UI. The changes replace ad-hoc colors with a semantic token system, featuring muted accents that harmonize with the `#151A1E` background.

---

## Design Philosophy

### Core Principles

1. **Restrained Accents**: Colors are muted and desaturated to feel native to dark backgrounds
2. **Semantic Tokens**: All colors are defined as semantic tokens (primary, success, warning, info) rather than arbitrary values
3. **Surface-Based Highlights**: Accents primarily appear as tinted surfaces (8-14% opacity) with subtle borders
4. **Premium Feel**: Inspired by Cursor's design language - professional, consistent, and restrained

### The Problem We Solved

**Before:**
- Bright, saturated colors (electric blues, neon greens, bright yellows)
- Ad-hoc color values scattered throughout components
- "Childish" status pills and badges
- Inconsistent accent usage
- Primary button too loud with glowing effects

**After:**
- Muted, harmonious accents designed for `#151A1E` backgrounds
- Centralized semantic token system
- Professional status pills with subtle tints
- Consistent accent application across all components
- Premium primary button with subtle depth

---

## Semantic Token System

### Base Tokens

Located in `src/app/globals.css` under `.dark` class:

```css
--briki-bg: #151A1E                           /* Main background */
--briki-surface-1: #1B2127                    /* Elevated surface */
--briki-surface-2: #202831                    /* Higher elevation */
--briki-border: rgba(255, 255, 255, 0.08)     /* Standard border */
--briki-border-subtle: rgba(255, 255, 255, 0.06) /* Subtle border */
--briki-text: rgba(255, 255, 255, 0.92)       /* Primary text */
--briki-text-muted: rgba(255, 255, 255, 0.62) /* Muted text */
--briki-text-subtle: rgba(255, 255, 255, 0.45) /* Subtle text */
```

### Accent Tokens

#### Primary (Muted Azure)
```css
--briki-primary: #5B8FCC                      /* Main primary color */
--briki-primary-surface: rgba(91, 143, 204, 0.10)   /* 10% tint */
--briki-primary-border: rgba(91, 143, 204, 0.18)    /* 18% border */
--briki-primary-foreground: rgba(255, 255, 255, 0.95) /* Text on primary */
```

**Usage:**
- Main CTAs (primary button)
- Active states in navigation
- Selected items
- Focus indicators

#### Success (Teal-Green-Gray)
```css
--briki-success: #4FA892
--briki-success-surface: rgba(79, 168, 146, 0.10)
--briki-success-border: rgba(79, 168, 146, 0.18)
--briki-success-foreground: rgba(255, 255, 255, 0.95)
```

**Usage:**
- "Activo" status pills
- Positive indicators
- Success messages
- Completed states

#### Warning (Soft Amber)
```css
--briki-warning: #D4A053
--briki-warning-surface: rgba(212, 160, 83, 0.10)
--briki-warning-border: rgba(212, 160, 83, 0.18)
--briki-warning-foreground: rgba(255, 255, 255, 0.95)
```

**Usage:**
- "Pendiente" status pills
- Attention indicators
- Warning messages
- Pending states

#### Info (Muted Blue-Gray)
```css
--briki-info: #6B8CA8
--briki-info-surface: rgba(107, 140, 168, 0.10)
--briki-info-border: rgba(107, 140, 168, 0.18)
--briki-info-foreground: rgba(255, 255, 255, 0.95)
```

**Usage:**
- "En revisión" status pills
- Informational indicators
- Secondary highlights
- Review states

---

## Component Patterns

### Status Pills / Badges

**Premium Pill Pattern:**

```tsx
<span
  style={{
    backgroundColor: 'var(--briki-success-surface)',  // 10% tint
    color: 'var(--briki-success)',                     // Full color for text
    border: '1px solid var(--briki-success-border)',  // 18% border
  }}
>
  Activo
</span>
```

**Characteristics:**
- Subtle tinted background (10% opacity)
- Border slightly stronger than background (18% opacity)
- Text color is the full accent color
- Small padding: `px-1.5 py-0.5`
- Small radius: `rounded` (not `rounded-full`)
- Small font: `text-[10px]`

### Primary Button

**Premium Enterprise Pattern:**

```tsx
<button
  style={{
    backgroundColor: 'var(--briki-primary)',
    color: 'var(--briki-primary-foreground)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)',  // Subtle depth
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-1px)';    // Small lift
    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
  }}
>
  Primary Action
</button>
```

**Characteristics:**
- Uses solid primary color (not transparent)
- Subtle shadow for depth
- Small lift on hover (`translateY(-1px)`)
- No glow effects
- Smooth transitions

### Secondary Buttons

**Pattern:**

```tsx
<button
  style={{
    backgroundColor: 'var(--briki-surface-1)',
    color: 'var(--briki-text-muted)',
    border: '1px solid var(--briki-border-subtle)',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = 'var(--briki-surface-2)';
  }}
>
  Secondary Action
</button>
```

**Characteristics:**
- Starts with surface-1 background
- Subtle border
- Hover moves to surface-2 (slightly lighter)
- No dramatic color changes

### Active Navigation Items

**Pattern:**

```tsx
<button
  style={{
    backgroundColor: 'var(--briki-primary-surface)',   // 10% tint
    color: 'var(--briki-primary)',                      // Primary text
    border: '1px solid var(--briki-primary-border)',   // 18% border
  }}
>
  Active Tab
</button>
```

**Characteristics:**
- Same pattern as status pills
- Clear but subtle visual distinction
- No bright fills

### Card / List Item Selection

**Pattern:**

```tsx
<div
  style={
    isSelected
      ? {
          backgroundColor: 'var(--briki-primary-surface)',
          border: '1px solid var(--briki-primary-border)',
        }
      : {
          backgroundColor: 'var(--briki-surface-1)',
          border: '1px solid var(--briki-border-subtle)',
        }
  }
>
  Content
</div>
```

---

## Tailwind Integration

All semantic tokens are available as Tailwind classes in `tailwind.config.ts`:

```tsx
// Background colors
bg-briki-bg
bg-briki-surface-1
bg-briki-surface-2

// Borders
border-briki-border
border-briki-border-subtle

// Text colors
text-briki-text
text-briki-text-muted
text-briki-text-subtle

// Primary
bg-briki-primary
bg-briki-primary-surface
border-briki-primary-border
text-briki-primary
text-briki-primary-foreground

// Success
bg-briki-success
bg-briki-success-surface
border-briki-success-border
text-briki-success

// Warning
bg-briki-warning
bg-briki-warning-surface
border-briki-warning-border
text-briki-warning

// Info
bg-briki-info
bg-briki-info-surface
border-briki-info-border
text-briki-info
```

**Example Usage:**

```tsx
<span className="bg-briki-success-surface text-briki-success border border-briki-success-border px-1.5 py-0.5 rounded text-[10px]">
  Activo
</span>
```

---

## Updated Components

### 1. `src/app/globals.css`
- ✅ Added complete semantic token system under `.dark` class
- ✅ Updated primary color from bright blue to muted azure
- ✅ Updated success color from bright green to teal-green-gray
- ✅ Updated warning color from bright yellow to soft amber
- ✅ Added new accent tokens (surface, border, foreground variants)

### 2. `tailwind.config.ts`
- ✅ Added all Briki semantic tokens to color palette
- ✅ Tokens available as Tailwind utility classes

### 3. `src/components/Landing/demos/LandingDashboardDemo.tsx`
- ✅ Replaced all hardcoded colors with semantic tokens
- ✅ Updated status pills (Activo, Pendiente, En revisión)
- ✅ Updated primary button to premium style
- ✅ Updated navigation active states
- ✅ Updated card selection states
- ✅ Updated all text colors to use semantic tokens
- ✅ Updated borders to use semantic tokens
- ✅ Updated surfaces to use semantic tokens

### 4. `src/components/ui/badge.tsx`
- ✅ Added new semantic variants: `success`, `warning`, `info`
- ✅ Variants use the proper surface + border pattern
- ✅ Existing variants (default, secondary, destructive, outline) unchanged

---

## Usage Guidelines

### When to Use Each Accent

| Token | Use Case | Examples |
|-------|----------|----------|
| **Primary** | Main actions, active states, focus | Primary CTA, active tabs, selected items |
| **Success** | Positive states, completion, active status | "Activo" pills, completed tasks, success messages |
| **Warning** | Attention needed, pending, caution | "Pendiente" pills, warnings, incomplete |
| **Info** | Informational, review, secondary highlight | "En revisión" pills, info messages, help text |

### Color Application Hierarchy

1. **Solid fills**: Only for the main primary CTA button
2. **Surface tints (10%)**: For status pills, badges, active states, selected items
3. **Borders (18%)**: Always accompany surface tints
4. **Full colors**: Only for text, small icons, or indicators

### Dos and Don'ts

✅ **DO:**
- Use semantic tokens consistently
- Apply accents as surface tints with subtle borders
- Use primary solid color only for main CTAs
- Keep status pills small and subtle
- Use text-muted for secondary information

❌ **DON'T:**
- Use bright, saturated colors
- Create glowing effects or dramatic shadows
- Use full accent colors as backgrounds (except primary button)
- Mix old hardcoded colors with new tokens
- Use neon or electric accent colors

---

## Migration Guide

### Replacing Old Patterns

#### Status Pills

**Before:**
```tsx
className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
```

**After:**
```tsx
style={{
  backgroundColor: 'var(--briki-success-surface)',
  color: 'var(--briki-success)',
  border: '1px solid var(--briki-success-border)',
}}
```

#### Primary Buttons

**Before:**
```tsx
className="bg-blue-500 hover:bg-blue-600 text-white"
```

**After:**
```tsx
style={{
  backgroundColor: 'var(--briki-primary)',
  color: 'var(--briki-primary-foreground)',
}}
```

#### Active Navigation

**Before:**
```tsx
className="bg-blue-500/10 text-blue-400 border border-blue-500/20"
```

**After:**
```tsx
style={{
  backgroundColor: 'var(--briki-primary-surface)',
  color: 'var(--briki-primary)',
  border: '1px solid var(--briki-primary-border)',
}}
```

---

## Visual Comparison

### Color Palette

| Old (Electric) | New (Muted) | Usage |
|----------------|-------------|-------|
| `#3B82F6` (blue-500) | `#5B8FCC` | Primary actions |
| `#10B981` (emerald-500) | `#4FA892` | Success states |
| `#F59E0B` (amber-500) | `#D4A053` | Warning states |
| `#3B82F6` (blue-500) | `#6B8CA8` | Info states |

### Opacity Levels

| Token | Opacity | Purpose |
|-------|---------|---------|
| `*-surface` | 10% | Background tints |
| `*-border` | 18% | Subtle borders |
| `*-foreground` | 95% | Text on solid backgrounds |
| `text` | 92% | Primary text |
| `text-muted` | 62% | Secondary text |
| `text-subtle` | 45% | Tertiary text |

---

## Future Enhancements

Consider applying the same semantic token system to:

1. **Main Application UI** - Extend beyond landing page
2. **Dashboard Components** - Apply to actual dashboard (not just demo)
3. **Form Elements** - Input fields, selects, checkboxes
4. **Notifications** - Toast messages, alerts, modals
5. **Charts & Data Viz** - Use semantic colors for data representation

---

## Testing Checklist

- [x] Status pills are subtle and professional
- [x] Primary button has subtle depth without glow
- [x] Active navigation states are clear but restrained
- [x] Selected items use proper surface tints
- [x] All colors harmonize with `#151A1E` background
- [x] Text contrast meets WCAG AA standards
- [x] Hover states are subtle and smooth
- [x] Focus states are visible but not jarring
- [x] Badge component variants work correctly
- [x] No bright/neon colors remain in landing components

---

## Support & Feedback

This design system represents a comprehensive shift toward a premium, professional dark UI. All changes are centralized in semantic tokens, making future adjustments straightforward.

For questions or suggestions, refer to this document and the updated component files.

---

**Last Updated:** December 29, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅





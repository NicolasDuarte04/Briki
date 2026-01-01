# Warm Accent Visual QA Guide

## Quick Visual Reference

This guide helps you verify the warm accent implementation matches the Cursor-inspired design intent.

## Color Swatches

### Dark Theme (Primary Landing Page)
```
Base:   #F97316  ███████  Confident orange, Cursor-inspired
Hover:  #FB923C  ███████  Brighter, more vibrant
Active: #EA580C  ███████  Deeper, more grounded
```

### Light Theme (Fallback)
```
Base:   #EA580C  ███████  Deep orange for light backgrounds
Hover:  #F97316  ███████  Brighter orange
Active: #C2410C  ███████  Deeper orange-red
```

## Component-by-Component Checklist

### 1. LandingDemoWide - "Learn More" Links

**Location**: Below each demo section description

**Expected Behavior**:
- [ ] Text color: Confident orange (#F97316)
- [ ] Font weight: Medium (500)
- [ ] Arrow icon: 14px, right-aligned
- [ ] Hover: Text brightens to #FB923C
- [ ] Hover: Underline appears (1px, 4px offset)
- [ ] Hover: Arrow shifts right 2px
- [ ] Active: Text darkens to #EA580C
- [ ] Transition: Smooth 200ms

**Visual Check**:
```
Before hover:  Learn more →  (amber, no underline)
On hover:      Learn more →  (brighter, underlined, arrow shifted)
```

### 2. LandingCTA - Demo Link

**Location**: Below contact form, "Request a demo" link

**Expected Behavior**:
- [ ] Same styling as "Learn more" links
- [ ] Centered alignment
- [ ] Consistent spacing with form above

### 3. LandingFooter - Navigation Links

**Location**: Footer columns (Product, Resources, Company, Legal, Connect)

**Expected Behavior**:
- [ ] Default: Muted white (rgba(248, 250, 252, 0.5))
- [ ] Hover: Confident orange (#F97316)
- [ ] Transition: Smooth 200ms color change
- [ ] No underline (different from marketing links)
- [ ] No arrow icon

**Visual Check**:
```
Before hover:  Features  (muted white)
On hover:      Features  (warm amber)
```

### 4. LandingFooter - Social Links

**Location**: Bottom bar (LinkedIn, X, YouTube)

**Expected Behavior**:
- [ ] Same hover behavior as footer navigation
- [ ] Smaller text (13px vs 14px)
- [ ] More muted default (rgba(248, 250, 252, 0.4))

## Cursor Comparison

### What Cursor Does Right
1. **Restraint**: Orange is a hint, not a takeover
2. **Hierarchy**: Blue = primary action, Orange = secondary/exploratory
3. **Consistency**: All "Learn more" style links use warm accent
4. **Subtlety**: Not neon, not loud - just enough contrast

### What We're Matching
- [x] Warm accent only on marketing CTAs
- [x] Blue remains dominant for product actions
- [x] Medium weight typography (not bold)
- [x] Subtle arrow animation
- [x] Underline on hover
- [x] Smooth transitions

### What We're NOT Doing
- ❌ Using warm accent on primary buttons
- ❌ Using warm accent on status indicators
- ❌ Using warm accent in product UI
- ❌ Making it neon or overly bright

## Browser Testing

Test in these browsers to ensure consistency:

### Desktop
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile
- [ ] Safari iOS
- [ ] Chrome Android

### Dark Mode
- [ ] System dark mode enabled
- [ ] Verify warm accent is visible
- [ ] Check contrast ratios

## Accessibility Checks

### Contrast Ratios (WCAG AA)
- [ ] Base color on dark bg: ≥ 4.5:1 ✓
- [ ] Hover color on dark bg: ≥ 4.5:1 ✓
- [ ] Active color on dark bg: ≥ 4.5:1 ✓

### Keyboard Navigation
- [ ] Tab to marketing links
- [ ] Focus ring visible
- [ ] Enter key activates link
- [ ] Focus state distinct from hover

### Screen Reader
- [ ] Links announce correctly
- [ ] Arrow icons hidden (aria-hidden)
- [ ] No duplicate announcements

## Common Issues & Fixes

### Issue: Warm accent looks too bright/neon
**Fix**: Verify CSS variables are correct. Should be #F97316, not a brighter value.

### Issue: Hover state not working
**Fix**: Check Tailwind classes are applied: `group-hover:text-briki-accent-warm-hover`

### Issue: Arrow not animating
**Fix**: Verify `transition-transform` class on arrow icon

### Issue: Underline too thick or offset wrong
**Fix**: Check `decoration-1 underline-offset-4` classes

### Issue: Color not showing in production
**Fix**: Ensure CSS variables are in `:root` or `.dark` scope, not nested

## Performance Checks

- [ ] No layout shift when hovering
- [ ] Transitions are smooth (60fps)
- [ ] No flash of unstyled content (FOUC)
- [ ] Colors load immediately (no delay)

## Final Approval Criteria

Before marking as "production ready":

1. **Visual Consistency**: All marketing CTAs use warm accent
2. **Hierarchy Maintained**: Blue still feels like primary brand
3. **Accessibility**: All contrast ratios pass WCAG AA
4. **Performance**: No jank or layout shifts
5. **Cross-browser**: Works in all major browsers
6. **Responsive**: Works on mobile and desktop
7. **Documentation**: This guide is accurate and complete

## Side-by-Side Comparison

### Before (Cool-only)
```
Learn more →  (muted white, opacity hover)
```

### After (Warm accent)
```
Learn more →  (confident orange, brighten + underline hover)
```

**Key Difference**: Warm accent creates a "pull" that guides users to exploratory actions, while blue "pushes" them to commit actions.

---

**Testing Date**: _____________  
**Tested By**: _____________  
**Status**: [ ] Pass [ ] Fail [ ] Needs Revision


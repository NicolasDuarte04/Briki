# Design System Migration Checklist

## 🎯 Overview

This document provides a step-by-step migration path to apply the new premium design system across the entire Briki application.

---

## ✅ Phase 1: Foundation (COMPLETED)

- [x] Define semantic tokens in `src/app/globals.css`
- [x] Add tokens to `tailwind.config.ts`
- [x] Update Badge component with new variants
- [x] Update LandingDashboardDemo component
- [x] Create documentation (PREMIUM_DESIGN_SYSTEM.md)
- [x] Create quick reference guide (DESIGN_SYSTEM_QUICK_REF.md)

---

## 📋 Phase 2: Landing Page Components

Systematically update all landing page components to use semantic tokens.

### High Priority (Visual Impact)

- [ ] **LandingFeatures.tsx**
  - [ ] Replace any hardcoded blues/greens with semantic tokens
  - [ ] Update any badges/pills to use new pattern
  - [ ] Check feature cards for color consistency

- [ ] **LandingCTA.tsx**
  - [ ] Primary button should use `var(--briki-primary)`
  - [ ] Secondary button should use surface pattern
  - [ ] Verify hover states

- [ ] **LandingFinalCTA.tsx**
  - [ ] Same as LandingCTA.tsx
  - [ ] Ensure consistency across both CTA sections

- [ ] **LandingPricing.tsx**
  - [ ] Update any status badges (Popular, Recommended, etc.)
  - [ ] Use semantic tokens for plan highlights
  - [ ] Update primary CTA buttons

### Medium Priority (Consistency)

- [ ] **LandingFeatureBlocks.tsx**
  - [ ] Update icon backgrounds if using bright colors
  - [ ] Check hover states on blocks

- [ ] **LandingFeaturesGrid.tsx**
  - [ ] Similar to FeatureBlocks
  - [ ] Update any accent highlights

- [ ] **LandingShowcase.tsx**
  - [ ] Update any highlighted elements
  - [ ] Check demo frames for consistency

- [ ] **LandingFAQ.tsx**
  - [ ] Update accordion active states if applicable
  - [ ] Check any status indicators

### Low Priority (Minor Elements)

- [ ] **LandingFooter.tsx**
  - [ ] Update link hover states if needed
  - [ ] Check any badges or labels

- [ ] **LandingSocialProof.tsx**
  - [ ] Update any highlighted testimonials
  - [ ] Check rating indicators

- [ ] **TrustBadge.tsx**
  - [ ] Update badge styling to match new system
  - [ ] Use semantic tokens

---

## 📋 Phase 3: Main Application UI

### Navigation & Layout

- [ ] **Main Navigation/Header**
  - [ ] Update active nav items to use `var(--briki-primary-surface)`
  - [ ] Update hover states
  - [ ] Check dropdown menus

- [ ] **Sidebar Navigation**
  - [ ] Active items use semantic tokens
  - [ ] Hover states are subtle
  - [ ] Icons use correct text colors

- [ ] **Breadcrumbs**
  - [ ] Current page uses primary color
  - [ ] Links use text-muted

### Dashboard Components

- [ ] **Dashboard Cards**
  - [ ] Replace any bright status indicators
  - [ ] Update card hover states
  - [ ] Use surface tokens for backgrounds

- [ ] **Stats/Metrics Cards**
  - [ ] Update trend indicators (up/down)
  - [ ] Use success/warning tokens appropriately
  - [ ] Check icon colors

- [ ] **Charts/Graphs**
  - [ ] Update chart colors to use semantic palette
  - [ ] Ensure data visualization is clear
  - [ ] Consider accessibility

### Data Tables

- [ ] **Status Columns**
  - [ ] "Activo" → success variant
  - [ ] "Pendiente" → warning variant
  - [ ] "En revisión" → info variant
  - [ ] Other statuses mapped appropriately

- [ ] **Row Selection**
  - [ ] Selected rows use `var(--briki-primary-surface)`
  - [ ] Hover states use `var(--briki-surface-2)`
  - [ ] Clear but subtle visual distinction

- [ ] **Action Buttons in Tables**
  - [ ] Primary actions use semantic primary
  - [ ] Secondary actions use surface pattern
  - [ ] Destructive actions remain red

### Forms

- [ ] **Input Fields**
  - [ ] Background: `var(--briki-surface-1)`
  - [ ] Border: `var(--briki-border-subtle)`
  - [ ] Focus border: `var(--briki-primary-border)`
  - [ ] Text: `var(--briki-text-muted)`

- [ ] **Select Dropdowns**
  - [ ] Same pattern as inputs
  - [ ] Selected item uses primary surface

- [ ] **Checkboxes/Radio**
  - [ ] Checked state uses `var(--briki-primary)`
  - [ ] Hover states are subtle

- [ ] **Form Validation**
  - [ ] Error states (use existing destructive)
  - [ ] Success states (use new success tokens)
  - [ ] Warning states (use new warning tokens)

### Modals & Dialogs

- [ ] **Modal Backgrounds**
  - [ ] Use `var(--briki-bg)` or `var(--briki-surface-1)`
  - [ ] Update borders

- [ ] **Modal Actions**
  - [ ] Primary action uses solid primary
  - [ ] Cancel/secondary use surface pattern
  - [ ] Destructive actions remain red

- [ ] **Confirmation Dialogs**
  - [ ] Update icon colors
  - [ ] Use semantic tokens for severity

### Notifications & Alerts

- [ ] **Toast Notifications**
  - [ ] Success → use success tokens
  - [ ] Warning → use warning tokens
  - [ ] Info → use info tokens
  - [ ] Error → keep destructive

- [ ] **Alert Banners**
  - [ ] Follow same pattern as toasts
  - [ ] Use surface + border pattern
  - [ ] Clear but not jarring

### Badges & Status Indicators

- [ ] **Search for all Badge usages**
  ```bash
  grep -r "Badge" src/components --include="*.tsx" -n
  ```
  - [ ] Update to use new variants
  - [ ] Or manually style with semantic tokens

- [ ] **Custom status pills**
  - [ ] Replace with semantic token pattern
  - [ ] Ensure consistency

### Buttons Throughout App

- [ ] **Primary CTAs**
  - [ ] All use `var(--briki-primary)`
  - [ ] Consistent hover states
  - [ ] One primary per screen/section

- [ ] **Secondary Buttons**
  - [ ] Use surface pattern
  - [ ] Subtle hover states

- [ ] **Icon Buttons**
  - [ ] Use text-muted color
  - [ ] Hover to text color
  - [ ] Active state uses primary if applicable

---

## 📋 Phase 4: Specialized Components

### Case/Client Management

- [ ] **Case List Items**
  - [ ] Status pills use new tokens
  - [ ] Selected cases use primary surface
  - [ ] Hover states are subtle

- [ ] **Case Detail View**
  - [ ] Info cards use surface-1
  - [ ] Action buttons follow hierarchy
  - [ ] Status indicators use semantic tokens

### Document Management

- [ ] **Document Cards**
  - [ ] Status indicators (uploaded, pending, etc.)
  - [ ] Use appropriate semantic tokens
  - [ ] Hover states

- [ ] **Upload States**
  - [ ] Progress indicators
  - [ ] Success/error states

### Comparisons & Proposals

- [ ] **Comparison Tables**
  - [ ] Highlighted rows/columns
  - [ ] Best value indicators
  - [ ] Selected items

- [ ] **Proposal Builder**
  - [ ] Step indicators
  - [ ] Active/completed steps
  - [ ] Validation states

---

## 🔍 Search & Replace Patterns

Use these patterns to find components that need updating:

### Find Bright Colors

```bash
# Find bright blues
grep -r "bg-blue-5" src/components --include="*.tsx" -n

# Find bright greens
grep -r "bg-emerald-" src/components --include="*.tsx" -n
grep -r "bg-green-" src/components --include="*.tsx" -n

# Find bright yellows/ambers
grep -r "bg-amber-" src/components --include="*.tsx" -n
grep -r "bg-yellow-" src/components --include="*.tsx" -n

# Find bright text colors
grep -r "text-blue-4" src/components --include="*.tsx" -n
grep -r "text-emerald-4" src/components --include="*.tsx" -n
```

### Find Status-Like Patterns

```bash
# Find potential status indicators
grep -ri "activo\|pendiente\|completed\|success\|warning" src/components --include="*.tsx" -C 2
```

### Find Inline Styles with Colors

```bash
# Find style props that might have hardcoded colors
grep -r "style={{.*background" src/components --include="*.tsx" -n
```

---

## ✅ Testing Checklist

After each component migration:

### Visual Testing

- [ ] Component looks professional and restrained
- [ ] No bright/neon colors remain
- [ ] Accent colors harmonize with #151A1E background
- [ ] Hover states are smooth and subtle
- [ ] Active/selected states are clear but not jarring

### Accessibility Testing

- [ ] Text contrast meets WCAG AA (4.5:1 minimum)
- [ ] Status indicators are distinguishable
- [ ] Focus states are visible
- [ ] Color is not the only indicator (use icons/text too)

### Consistency Testing

- [ ] Component matches other updated components
- [ ] Same semantic token used for similar purposes
- [ ] Button hierarchy is clear
- [ ] Status indicators follow same pattern

### Functional Testing

- [ ] Interactive states work correctly
- [ ] Hover/focus/active states trigger properly
- [ ] No visual regressions
- [ ] Component behavior unchanged

---

## 📊 Progress Tracking

Use this table to track migration progress:

| Component/Area | Priority | Status | Notes |
|----------------|----------|--------|-------|
| LandingDashboardDemo | High | ✅ Done | Reference implementation |
| Badge component | High | ✅ Done | New variants added |
| LandingFeatures | High | ⏳ Pending | |
| LandingCTA | High | ⏳ Pending | |
| Dashboard Cards | High | ⏳ Pending | |
| Data Tables | High | ⏳ Pending | |
| Form Inputs | Medium | ⏳ Pending | |
| Modals | Medium | ⏳ Pending | |
| Notifications | Medium | ⏳ Pending | |

**Legend:**
- ✅ Done
- 🚧 In Progress
- ⏳ Pending
- ⏸️ Blocked
- ✖️ Skipped

---

## 🎯 Quick Migration Steps (Per Component)

1. **Identify** all color usages in the component
2. **Map** each color to appropriate semantic token
3. **Replace** hardcoded colors with tokens
4. **Test** visual appearance and functionality
5. **Document** any special cases or decisions
6. **Commit** with descriptive message

### Example Commit Messages

```
feat(design): migrate LandingFeatures to premium design system

- Replace bg-blue-500 with var(--briki-primary)
- Update status badges to use semantic success/warning tokens
- Refactor hover states to be more subtle
- Ensure WCAG AA contrast compliance

Refs: PREMIUM_DESIGN_SYSTEM.md
```

---

## 🛠️ Tools & Scripts

### Color Audit Script

Create `scripts/audit-colors.sh`:

```bash
#!/bin/bash
echo "=== Bright Blues ==="
grep -r "bg-blue-[4-6]" src/components --include="*.tsx" | wc -l
echo ""
echo "=== Bright Greens ==="
grep -r "bg-emerald-\|bg-green-[4-6]" src/components --include="*.tsx" | wc -l
echo ""
echo "=== Bright Yellows ==="
grep -r "bg-amber-\|bg-yellow-[4-6]" src/components --include="*.tsx" | wc -l
```

### Validate Semantic Tokens

Create `scripts/validate-tokens.sh`:

```bash
#!/bin/bash
# Check if components are using semantic tokens
echo "Components using semantic tokens:"
grep -r "var(--briki-" src/components --include="*.tsx" | wc -l
```

---

## 📚 Reference Materials

While migrating, refer to:

1. **PREMIUM_DESIGN_SYSTEM.md** - Full design system documentation
2. **DESIGN_SYSTEM_QUICK_REF.md** - Copy-paste ready patterns
3. **LandingDashboardDemo.tsx** - Reference implementation
4. **Badge component** - Example of variant-based approach

---

## 🎨 Design Review Criteria

Before marking a component as "Done":

### Visual Quality
- [ ] Looks premium and professional
- [ ] Colors feel cohesive with #151A1E
- [ ] Spacing and sizing are appropriate
- [ ] Typography hierarchy is clear

### Consistency
- [ ] Matches design system patterns
- [ ] Similar elements look similar
- [ ] Status indicators follow conventions
- [ ] Button hierarchy is clear

### Accessibility
- [ ] Text contrast ratio ≥ 4.5:1
- [ ] Interactive elements have focus states
- [ ] Status not conveyed by color alone
- [ ] Screen reader friendly

### Performance
- [ ] No unnecessary re-renders
- [ ] Smooth animations/transitions
- [ ] No console errors/warnings

---

## 💡 Pro Tips

1. **Start with high-impact components** - Dashboard, tables, and landing page first
2. **Test in dark mode** - Design system is optimized for dark backgrounds
3. **Use browser DevTools** - Test token values in real-time
4. **Take screenshots** - Before/after comparisons help validate improvements
5. **Batch similar components** - Migrate all status badges at once, all buttons at once, etc.

---

## 🚀 Ready to Migrate?

1. Pick a component from Phase 2 or 3
2. Follow the Quick Migration Steps
3. Test thoroughly
4. Update the Progress Tracking table
5. Commit with clear message
6. Move to next component

**Remember:** Quality over speed. Each migrated component should be better than before! ✨

---

**Last Updated:** December 29, 2025  
**Version:** 1.0.0





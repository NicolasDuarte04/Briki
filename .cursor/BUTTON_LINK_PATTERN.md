# Button/Link Composition Pattern - Quick Reference

## The Correct Pattern

Use the Button component with `asChild` prop to wrap a Next.js Link:

```tsx
import { Button } from '@/components/ui/button';
import Link from 'next/link';

<Button asChild variant="default" size="lg">
  <Link href="/destination">
    Button Text
  </Link>
</Button>
```

## Why This Works

The `asChild` prop uses Radix UI's Slot component to merge the Button's props and styling with the Link's underlying `<a>` element. The final DOM output is:

```html
<a href="/destination" class="inline-flex items-center justify-center ...">
  Button Text
</a>
```

## Common Mistakes to Avoid

### ❌ WRONG: Link wrapping Button
```tsx
<Link href="/destination">
  <Button>Click me</Button>
</Link>
```
**DOM Output:** `<a><button>Click me</button></a>` (Invalid HTML - buttons can't be inside links)

### ❌ WRONG: Button wrapping Link
```tsx
<Button>
  <Link href="/destination">Click me</Link>
</Button>
```
**DOM Output:** `<button><a>Click me</a></button>` (Invalid HTML - links can't be inside buttons)

### ✅ CORRECT: Button with asChild
```tsx
<Button asChild>
  <Link href="/destination">Click me</Link>
</Button>
```
**DOM Output:** `<a href="/destination">Click me</a>` (Valid HTML - single anchor element with button styling)

## When NOT to Use asChild

Use plain `<button>` elements when:
- Triggering client-side actions (modals, dropdowns, etc.)
- Submitting forms (`type="submit"`)
- Executing JavaScript functions without navigation

```tsx
// ✅ Plain button for client-side action
<Button onClick={handleClick}>
  Open Modal
</Button>

// ✅ Submit button
<Button type="submit">
  Submit Form
</Button>
```

## Accessibility Benefits

Using the correct pattern ensures:
- ✅ Semantic HTML (anchors for navigation, buttons for actions)
- ✅ Proper keyboard navigation (Enter for buttons, Enter/Space for links)
- ✅ Screen reader compatibility (correct role announcements)
- ✅ Browser default behaviors (right-click → "Open in new tab" works for links)

## Real Examples from Codebase

### Navigation CTA
```tsx
// src/components/Landing/LandingNavigation.tsx
<Button
  asChild
  className="rounded-full px-4 py-1 h-8 text-sm bg-[var(--briki-primary)] text-white"
>
  <Link href="/login">Start</Link>
</Button>
```

### Workspace Actions
```tsx
// src/components/Workspace/QuickActions.tsx
<Button
  asChild
  variant="outline"
  className="h-auto flex-col gap-3 p-6"
>
  <Link href={pathForNewEntity('client', locale)}>
    <UserPlus className="size-8 text-primary" />
    <span>Nuevo cliente</span>
  </Link>
</Button>
```

### Continue Working
```tsx
// src/components/Workspace/ContinueCard.tsx
<Button 
  asChild 
  className="w-full justify-between group"
>
  <Link href={entityPath}>
    <span>Continuar</span>
    <ChevronRight className="size-4" />
  </Link>
</Button>
```


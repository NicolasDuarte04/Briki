# Route Helpers Migration Guide

This guide walks you through migrating from hardcoded paths to the new route helpers system.

## Quick Reference

```typescript
// ❌ Before
const url = `/workspace/clients/${clientId}`;
<Link href="/es/workspace/policies/pol-001">View Policy</Link>

// ✅ After
import { pathForClient } from '@/lib/routes/workspace';
const url = pathForClient(clientId, locale);
<Link href={pathForPolicy('pol-001', locale)}>View Policy</Link>
```

## Step-by-Step Migration

### Step 1: Add Import

At the top of your file, import the helpers you need:

```typescript
import {
  pathForClient,
  pathForPolicy,
  pathForProposal,
  pathForCase,
  pathForAnalysis,
  getWorkspaceHome,
  type Locale,
} from '@/lib/routes/workspace';
```

### Step 2: Get Locale

#### Server Components (Recommended)

```typescript
export default function MyPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  
  // Use locale in route helpers...
}
```

#### Client Components

```typescript
'use client';

import { useParams } from 'next/navigation';
import { type Locale } from '@/lib/routes/workspace';

export function MyClientComponent() {
  const params = useParams();
  const locale = params.locale as Locale;
  
  // Use locale in route helpers...
}
```

#### From Window Location (Last Resort)

```typescript
import { parseLocaleFromPath } from '@/lib/routes/workspace';

const locale = parseLocaleFromPath(window.location.pathname);
```

### Step 3: Replace Hardcoded Paths

Search your codebase for these patterns and replace them:

#### Pattern 1: Direct String Literals

```typescript
// ❌ Before
<Link href="/workspace/clients/cli-001">View Client</Link>
<Link href="/es/workspace/policies/pol-123">View Policy</Link>

// ✅ After
<Link href={pathForClient('cli-001', locale)}>View Client</Link>
<Link href={pathForPolicy('pol-123', locale)}>View Policy</Link>
```

#### Pattern 2: Template Literals

```typescript
// ❌ Before
const url = `/workspace/proposals/${proposalId}`;
const listUrl = `/es/workspace/cases`;

// ✅ After
const url = pathForProposal(proposalId, locale);
const listUrl = pathForCases(locale);
```

#### Pattern 3: String Concatenation

```typescript
// ❌ Before
const baseUrl = '/workspace/clients';
const detailUrl = baseUrl + '/' + clientId;

// ✅ After
const baseUrl = pathForClients(locale);
const detailUrl = pathForClient(clientId, locale);
```

#### Pattern 4: Router.push / redirect

```typescript
// ❌ Before
import { redirect } from 'next/navigation';
redirect(`/es/workspace/cases/${caseId}`);

// ✅ After
import { redirect } from 'next/navigation';
import { pathForCase } from '@/lib/routes/workspace';
redirect(pathForCase(caseId, locale));
```

## Common Migration Scenarios

### Scenario 1: Recent Items List

```typescript
// ❌ Before
const recentItems = items.map(item => ({
  ...item,
  href: `/workspace/policies/${item.id}`,
}));

// ✅ After
import { pathForPolicy } from '@/lib/routes/workspace';

const recentItems = items.map(item => ({
  ...item,
  href: pathForPolicy(item.id, locale),
}));
```

### Scenario 2: Navigation Config

```typescript
// ❌ Before
const navItems = [
  { name: 'Policies', href: '/workspace/policies' },
  { name: 'Clients', href: '/workspace/clients' },
];

// ✅ After
import { pathForPolicies, pathForClients } from '@/lib/routes/workspace';

function getNavItems(locale: Locale) {
  return [
    { name: 'Policies', href: pathForPolicies(locale) },
    { name: 'Clients', href: pathForClients(locale) },
  ];
}

// Usage
const navItems = getNavItems(locale);
```

### Scenario 3: Dynamic Entity Types

```typescript
// ❌ Before
function getEntityUrl(type: string, id: string) {
  switch (type) {
    case 'policy': return `/workspace/policies/${id}`;
    case 'client': return `/workspace/clients/${id}`;
    default: return '/workspace';
  }
}

// ✅ After
import { pathForEntity, type EntityType } from '@/lib/routes/workspace';

function getEntityUrl(type: EntityType, id: string, locale: Locale) {
  return pathForEntity(type, id, locale);
}
```

### Scenario 4: Form Actions

```typescript
// ❌ Before
<form action="/workspace/clients/new" method="POST">
  {/* form fields */}
</form>

// ✅ After
import { pathForNewEntity } from '@/lib/routes/workspace';

<form action={pathForNewEntity('client', locale)} method="POST">
  {/* form fields */}
</form>
```

## Search Patterns for Your Codebase

Use these regex patterns to find hardcoded paths that need migration:

```bash
# Find hardcoded workspace paths
grep -r "'/workspace" src/

# Find template literals with workspace
grep -r '\`.*\/workspace' src/

# Find hardcoded locale prefixes
grep -r "'/es/workspace" src/
grep -r "'/en/workspace" src/
```

## Verification Checklist

After migration, verify:

- [ ] All workspace paths use route helpers
- [ ] No hardcoded `/workspace/` strings in components
- [ ] No hardcoded `/es/` or `/en/` locale prefixes
- [ ] All helpers receive the `locale` parameter
- [ ] Navigation works in both Spanish and English
- [ ] Links are correctly generated in production builds
- [ ] No TypeScript errors related to Locale types

## TypeScript Tips

### Type-Safe Entity Type

```typescript
import { type EntityType } from '@/lib/routes/workspace';

function MyComponent({ entityType }: { entityType: EntityType }) {
  // TypeScript will enforce valid entity types:
  // 'policy' | 'proposal' | 'analysis' | 'case' | 'client'
}
```

### Type-Safe Locale

```typescript
import { type Locale } from '@/lib/routes/workspace';

function MyComponent({ locale }: { locale: Locale }) {
  // TypeScript will enforce valid locales: 'es' | 'en'
}
```

### Validate Runtime Locale

```typescript
import { isValidLocale, normalizeLocale } from '@/lib/routes/workspace';

// Option 1: Validate and throw
const locale = params.locale;
if (!isValidLocale(locale)) {
  throw new Error('Invalid locale');
}

// Option 2: Normalize to default
const safeLocale = normalizeLocale(params.locale);
```

## Testing Your Migration

### Manual Testing

1. **Test navigation in Spanish** (`/es/...`)
   - [ ] Click all workspace links
   - [ ] Verify URLs are correct
   - [ ] Check breadcrumbs

2. **Test navigation in English** (`/en/...`)
   - [ ] Click all workspace links
   - [ ] Verify URLs are correct
   - [ ] Check breadcrumbs

3. **Test entity types**
   - [ ] Policies
   - [ ] Proposals
   - [ ] Analyses
   - [ ] Cases
   - [ ] Clients

### Automated Testing

```typescript
import { pathForClient } from '@/lib/routes/workspace';
import { render } from '@testing-library/react';

test('generates correct client link', () => {
  const { getByRole } = render(
    <Link href={pathForClient('cli-001', 'es')}>View Client</Link>
  );
  
  expect(getByRole('link')).toHaveAttribute(
    'href',
    '/es/workspace/clients/cli-001'
  );
});
```

## Rollback Plan

If you need to rollback:

1. The old hardcoded paths still work (Next.js routing unchanged)
2. You can migrate incrementally - old and new approaches coexist
3. Git history preserves all previous path strings

## Future Enhancements

Once migration is complete, you'll be ready for:

### Multi-Org Support

```typescript
// Just uncomment the org-aware helpers in workspace.ts
import { pathForEntityWithOrg } from '@/lib/routes/workspace';

const url = pathForEntityWithOrg('acme-corp', 'policy', 'pol-001', 'es');
// => '/es/acme-corp/workspace/policies/pol-001'
```

### Custom Path Prefixes

All paths can be updated from a single location in `workspace.ts`.

### Analytics & Tracking

Add tracking wrapper:

```typescript
function trackAndNavigate(path: string) {
  analytics.track('navigation', { path });
  router.push(path);
}

trackAndNavigate(pathForClient(clientId, locale));
```

## Getting Help

- Review `src/lib/routes/README.md` for API documentation
- Check `src/components/Workspace/ContinueCard.tsx` for example usage
- Run tests: `npm test -- workspace.test.ts`

## FAQ

**Q: Can I mix old and new approaches during migration?**  
A: Yes! Migrate incrementally. Both approaches work simultaneously.

**Q: What if I don't have access to `locale` parameter?**  
A: Use `parseLocaleFromPath(pathname)` or pass locale down from parent.

**Q: Will this break existing bookmarks/links?**  
A: No! The actual routes haven't changed, just how we generate the URLs.

**Q: Do I need to update API routes?**  
A: No, route helpers are for frontend navigation only.

**Q: What about external links?**  
A: Keep external links as plain strings. Use helpers only for internal workspace navigation.


# Route Helpers

Single source of truth for all application routes. This ensures consistency, type safety, and easy future migration to multi-org support.

## Quick Start

```typescript
import {
  parseLocaleFromPath,
  getWorkspaceHome,
  pathForClient,
  pathForProposal,
  pathForNewEntity,
} from '@/lib/routes/workspace';

// Parse locale from current path
const locale = parseLocaleFromPath(pathname); // 'es' | 'en'

// Build workspace home
const workspaceUrl = getWorkspaceHome(locale); // '/es/workspace'

// Build entity paths
const clientUrl = pathForClient('cli-001', locale);     // '/es/workspace/clients/cli-001'
const proposalUrl = pathForProposal('prop-001', locale); // '/es/workspace/proposals/prop-001'

// Build "new" paths
const newPolicyUrl = pathForNewEntity('policy', locale); // '/es/workspace/policies/new'
```

## Core Principles

1. **No hardcoded strings** - All paths go through helpers
2. **Locale-aware** - Every helper accepts an optional locale parameter
3. **Type-safe** - TypeScript ensures valid entity types and locales
4. **Pure functions** - No framework dependencies, easy to test
5. **Future-ready** - Prepared for multi-org support (`/[org]/workspace`)

## Available Helpers

### Locale Utilities

- `parseLocaleFromPath(pathname)` - Extract locale from URL
- `isValidLocale(locale)` - Validate locale string
- `normalizeLocale(locale)` - Normalize locale or return default

### Workspace Paths

- `getWorkspaceHome(locale)` - Workspace home: `/es/workspace`
- `getDashboardHome(locale)` - Dashboard home: `/es/dashboard`

### Entity Paths (Detail)

- `pathForPolicy(id, locale)` - `/es/workspace/policies/pol-001`
- `pathForProposal(id, locale)` - `/es/workspace/proposals/prop-001`
- `pathForAnalysis(id, locale)` - `/es/workspace/analysis/ana-001`
- `pathForCase(id, locale)` - `/es/workspace/cases/case-001`
- `pathForClient(id, locale)` - `/es/workspace/clients/cli-001`

### Entity Paths (List)

- `pathForPolicies(locale)` - `/es/workspace/policies`
- `pathForProposals(locale)` - `/es/workspace/proposals`
- `pathForAnalyses(locale)` - `/es/workspace/analysis`
- `pathForCases(locale)` - `/es/workspace/cases`
- `pathForClients(locale)` - `/es/workspace/clients`

### Generic Helpers

- `pathForEntity(entityType, id, locale)` - Generic detail path
- `pathForEntityList(entityType, locale)` - Generic list path
- `pathForNewEntity(entityType, locale)` - Generic create path
- `pathForEditEntity(entityType, id, locale)` - Generic edit path

## Migration Guide

### Before (❌ Bad)

```typescript
// Hardcoded strings scattered everywhere
<Link href="/workspace/clients/cli-001">View Client</Link>
<Link href={`/es/workspace/policies/${policyId}`}>View Policy</Link>
const url = `/workspace/proposals/new`;
```

### After (✅ Good)

```typescript
import { pathForClient, pathForPolicy, pathForNewEntity } from '@/lib/routes/workspace';

<Link href={pathForClient('cli-001', locale)}>View Client</Link>
<Link href={pathForPolicy(policyId, locale)}>View Policy</Link>
const url = pathForNewEntity('proposal', locale);
```

## Common Patterns

### Server Components

```typescript
import { pathForCase } from '@/lib/routes/workspace';

export default function CasesPage({ params }: { params: { locale: string } }) {
  const cases = await fetchCases();
  
  return (
    <ul>
      {cases.map(c => (
        <li key={c.id}>
          <Link href={pathForCase(c.id, params.locale)}>{c.title}</Link>
        </li>
      ))}
    </ul>
  );
}
```

### Client Components with useParams

```typescript
'use client';

import { useParams } from 'next/navigation';
import { pathForClient, type Locale } from '@/lib/routes/workspace';

export function ClientLink({ clientId }: { clientId: string }) {
  const params = useParams();
  const locale = params.locale as Locale;
  
  return <Link href={pathForClient(clientId, locale)}>View Client</Link>;
}
```

### Dynamic Entity Links

```typescript
import { pathForEntity, type EntityType } from '@/lib/routes/workspace';

function EntityLink({ type, id, locale }: { 
  type: EntityType; 
  id: string; 
  locale: string 
}) {
  return <Link href={pathForEntity(type, id, locale)}>View {type}</Link>;
}

// Usage
<EntityLink type="policy" id="pol-001" locale="es" />
<EntityLink type="client" id="cli-001" locale="en" />
```

## Testing

Pure functions with no dependencies make testing straightforward:

```typescript
import { parseLocaleFromPath, pathForClient } from '@/lib/routes/workspace';

describe('Route Helpers', () => {
  it('parses locale from path', () => {
    expect(parseLocaleFromPath('/es/dashboard')).toBe('es');
    expect(parseLocaleFromPath('/en/workspace')).toBe('en');
    expect(parseLocaleFromPath('/dashboard')).toBe('es'); // default
  });

  it('builds client paths', () => {
    expect(pathForClient('cli-001', 'es')).toBe('/es/workspace/clients/cli-001');
    expect(pathForClient('cli-001', 'en')).toBe('/en/workspace/clients/cli-001');
  });
});
```

## Future: Multi-Org Support

When ready to support multiple organizations, uncomment the org-aware helpers in `workspace.ts`:

```typescript
// Future usage
import { getWorkspaceHomeWithOrg, pathForEntityWithOrg } from '@/lib/routes/workspace';

const workspaceUrl = getWorkspaceHomeWithOrg('acme-corp', 'es');
// => '/es/acme-corp/workspace'

const policyUrl = pathForEntityWithOrg('acme-corp', 'policy', 'pol-001', 'es');
// => '/es/acme-corp/workspace/policies/pol-001'
```

## Checklist for Adopting

- [ ] Import route helpers in all components
- [ ] Replace hardcoded path strings with helper functions
- [ ] Pass `locale` parameter (from `params.locale` or `useParams()`)
- [ ] Use generic helpers (`pathForEntity`) for dynamic entity types
- [ ] Update tests to use route helpers
- [ ] Remove any path construction logic from components

## Related Files

- `src/lib/routes/workspace.ts` - Main implementation
- `src/middleware.ts` - Locale handling and routing logic
- `src/components/Workspace/ContinueCard.tsx` - Example usage


# Route Helpers Quick Reference Card

## Import

```typescript
import { 
  pathForClient, 
  pathForPolicy,
  pathForProposal,
  pathForCase,
  pathForAnalysis,
  pathForEntity,
  pathForNewEntity,
  getWorkspaceHome,
  type Locale 
} from '@/lib/routes/workspace';
```

## Common Usage

| Need | Helper | Example Output |
|------|--------|---------------|
| Client detail | `pathForClient(id, locale)` | `/es/workspace/clients/cli-001` |
| Policy detail | `pathForPolicy(id, locale)` | `/es/workspace/policies/pol-001` |
| Proposal detail | `pathForProposal(id, locale)` | `/es/workspace/proposals/prop-001` |
| Case detail | `pathForCase(id, locale)` | `/es/workspace/cases/case-001` |
| Analysis detail | `pathForAnalysis(id, locale)` | `/es/workspace/analysis/ana-001` |
| Client list | `pathForClients(locale)` | `/es/workspace/clients` |
| Policy list | `pathForPolicies(locale)` | `/es/workspace/policies` |
| New client | `pathForNewEntity('client', locale)` | `/es/workspace/clients/new` |
| New policy | `pathForNewEntity('policy', locale)` | `/es/workspace/policies/new` |
| Edit case | `pathForEditEntity('case', id, locale)` | `/es/workspace/cases/case-001/edit` |
| Workspace home | `getWorkspaceHome(locale)` | `/es/workspace` |
| Dashboard home | `getDashboardHome(locale)` | `/es/dashboard` |

## Get Locale

### Server Component
```typescript
export default function Page({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  // use locale...
}
```

### Client Component
```typescript
'use client';
import { useParams } from 'next/navigation';

export function Component() {
  const { locale } = useParams();
  // use locale...
}
```

### From Path
```typescript
import { parseLocaleFromPath } from '@/lib/routes/workspace';
const locale = parseLocaleFromPath(pathname); // 'es' or 'en'
```

## Patterns

### Link to Entity
```typescript
<Link href={pathForClient(client.id, locale)}>
  {client.name}
</Link>
```

### Navigate Programmatically
```typescript
import { useRouter, useParams } from 'next/navigation';

const router = useRouter();
const { locale } = useParams();

router.push(pathForPolicy(policyId, locale as Locale));
```

### Dynamic Entity Type
```typescript
<Link href={pathForEntity(item.type, item.id, locale)}>
  View {item.type}
</Link>
```

### Form Action
```typescript
<form action={pathForNewEntity('client', locale)} method="POST">
  {/* form */}
</form>
```

### Breadcrumbs
```typescript
const breadcrumbs = [
  { label: 'Workspace', href: getWorkspaceHome(locale) },
  { label: 'Clients', href: pathForClients(locale) },
  { label: client.name, href: pathForClient(client.id, locale) },
];
```

## Types

```typescript
type Locale = 'en' | 'es'
type EntityType = 'policy' | 'proposal' | 'analysis' | 'case' | 'client'
```

## Remember

- ✅ Always pass locale
- ✅ Default locale is `'es'`
- ✅ All paths include locale prefix
- ✅ Use specific helpers when possible
- ✅ Use generic helpers for dynamic types

## Don't

- ❌ Hardcode paths: `"/workspace/clients"`
- ❌ Template literals: `` `/workspace/${entity}` ``
- ❌ Missing locale: `pathForClient(id)` (OK but uses default)
- ❌ Invalid entity types (TypeScript will catch)


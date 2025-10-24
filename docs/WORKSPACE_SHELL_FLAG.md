# Workspace Shell Feature Flag

## Overview

The workspace shell feature flag controls whether the application renders the new workspace UI with the sidebar navigation or falls back to a simple layout.

## Default Behavior

- **Local Development**: **Always enabled** by default for optimal developer experience
- **Production/Preview**: **Always enabled** by default, but can be disabled via environment variable if needed

## Configuration

### Environment Variable

Set the following environment variable to control the workspace shell:

```bash
NEXT_PUBLIC_ENABLE_WORKSPACE_SHELL=true  # Enable workspace shell
NEXT_PUBLIC_ENABLE_WORKSPACE_SHELL=false # Disable workspace shell
```

### Development Override

In local development, the workspace shell is **always enabled** regardless of the environment variable setting. This ensures developers always see the latest UI without having to toggle environment variables.

```typescript
// From src/lib/env.ts
get ENABLE_WORKSPACE_SHELL() {
  const flagValue = process.env.NEXT_PUBLIC_ENABLE_WORKSPACE_SHELL;
  // Default to true in development, respect explicit env var in other environments
  if (flagValue === undefined) {
    return process.env.NODE_ENV === 'development' ? true : true;
  }
  return flagValue === 'true' || flagValue === '1';
}
```

## Implementation Details

### Flag Definition

Location: `src/lib/env.ts`

The flag is defined as a getter in the centralized environment configuration, ensuring type-safe access throughout the application.

### Usage in Layout

Location: `src/app/[locale]/(app)/layout.tsx`

The layout checks the flag before rendering:

```typescript
// Feature flag: Workspace shell (default enabled in development)
// In dev, always show the new workspace shell for optimal DX
const showWorkspaceShell = env.ENABLE_WORKSPACE_SHELL || env.IS_DEVELOPMENT;

if (!showWorkspaceShell) {
  // Fallback to simple layout if feature is explicitly disabled
  return <div className="min-h-screen">{children}</div>;
}

return (
  <BrikiSidebarLayout sidebar={<SidebarNav />}>
    {children}
  </BrikiSidebarLayout>
);
```

## Use Cases

### Local Development
No configuration needed - workspace shell is always visible.

### CI/Preview Environments
By default, workspace shell is enabled. To disable:

```bash
# In your CI configuration or preview environment
export NEXT_PUBLIC_ENABLE_WORKSPACE_SHELL=false
```

### A/B Testing or Gradual Rollout
Control workspace shell visibility per environment:

```bash
# Preview environment - new workspace shell
NEXT_PUBLIC_ENABLE_WORKSPACE_SHELL=true

# Staging environment - test without workspace shell
NEXT_PUBLIC_ENABLE_WORKSPACE_SHELL=false
```

## Success Criteria

✅ Local developers always see the new workspace shell without toggling env vars  
✅ CI/preview environments can gate the feature if needed  
✅ No conditional skipping of the sidebar shell in development  
✅ Type-safe environment variable access  
✅ Centralized configuration  

## Related Files

- `src/lib/env.ts` - Feature flag definition
- `src/app/[locale]/(app)/layout.tsx` - Flag consumption
- `src/components/BrikiSidebarLayout.tsx` - Workspace shell component
- `src/components/SidebarNav.tsx` - Sidebar navigation component


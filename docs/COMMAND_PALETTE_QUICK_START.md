# Command Palette - Quick Start Guide

## For End Users

### Opening the Command Palette

**Keyboard Shortcut**: 
- **Mac**: `Cmd + K`
- **Windows/Linux**: `Ctrl + K`

### Available Actions

Press `Cmd/Ctrl + K` and type to search:

| Action | Keywords | What it does |
|--------|----------|--------------|
| **Analizar PDF** | `pdf`, `analizar`, `subir` | Upload and analyze policy PDF |
| **Nueva comparación** | `comp`, `comparar` | Start new policy comparison |
| **Crear propuesta** | `propuesta`, `crear` | Create new proposal |
| **Nuevo cliente** | `cliente`, `nuevo` | Add new client |
| **Abrir Agente** | `agente`, `chat`, `ayuda` | Open AI assistant |

### Recent Items

Your 8 most recent policies and proposals appear automatically. Just start typing the client name to filter.

### Tips

- **Fast access**: Most actions are just 2-3 keystrokes
  - Example: `Cmd+K` → type `pdf` → `Enter`
  
- **Smart search**: Type any keyword, not just the start
  - `prop` finds "Crear **prop**uesta"
  
- **Navigation**: Use ↑/↓ arrows to select, Enter to execute

- **Close**: Press `Escape` or click outside

## For Developers

### Integration Status

✅ **Already Integrated** - The CommandPalette is globally available in:
- File: `src/app/[locale]/layout.tsx`
- Lines: 2, 24

### Quick Reference

```typescript
// Component location
import CommandPalette from "@/components/CommandPalette";

// API endpoint for recents
GET /api/workspace/recents

// Data functions used
import { getRecentPolicies, getRecentProposals } from "@/lib/data/workspace";

// Route helpers
import { parseLocaleFromPath, pathForPolicy, pathForProposal } from "@/lib/routes/workspace";
```

### Testing Locally

1. **Start dev server**: `npm run dev`
2. **Navigate to**: `http://localhost:3000/es/dashboard`
3. **Press**: `Cmd/Ctrl + K`
4. **Test actions**: Try each quick action
5. **Check recents**: Verify recent items load

### Troubleshooting

**Palette won't open?**
- Check browser console for errors
- Verify keyboard event listener is active
- Try custom event: `window.dispatchEvent(new Event("briki:cmdk"))`

**Recents not loading?**
- Check `/api/workspace/recents` returns 200
- Verify user has orgId in session
- Check network tab for API call

**PDF Upload not working?**
- Verify orgId is fetched on palette open
- Check PdfUploader component is available
- Ensure user has upload permissions

## Success Metrics

**Power user efficiency**:
- Actions accessible in **≤2 keystrokes**
- No mouse needed for common workflows
- Recents loaded **on demand** (not eagerly)

**Accessibility**:
- Full keyboard navigation ✅
- ARIA labels on all items ✅
- Screen reader compatible ✅

**Performance**:
- Lazy loaded components ✅
- Conditional data fetching ✅
- Optimized bundle size ✅


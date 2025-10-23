# Command Palette - Power User Interface

## Overview

The Command Palette provides power users with quick keyboard-driven access to all major actions and recent items in Briki. Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) from anywhere in the app.

## Features

### ⌨️ Keyboard Shortcuts
- **Cmd/Ctrl + K**: Open command palette
- **Escape**: Close palette
- **↑/↓ Arrow keys**: Navigate items
- **Enter**: Execute selected action
- **Type to search**: Filter actions and recents

### 🎯 Quick Actions

All primary workflow actions are accessible in ≤2 keystrokes:

1. **Analizar PDF** - Upload and analyze policy PDFs
   - Keywords: `analizar`, `pdf`, `póliza`, `upload`, `subir`
   
2. **Nueva comparación** - Start policy comparison
   - Keywords: `comparación`, `comparar`, `pólizas`, `nuevo`
   - Navigates to: `/{locale}/workspace/cases/new?kind=comparison`

3. **Crear propuesta** - Create new proposal
   - Keywords: `propuesta`, `crear`, `nuevo`
   - Navigates to: `/{locale}/workspace/cases/new?kind=proposal`

4. **Nuevo cliente** - Add new client
   - Keywords: `cliente`, `nuevo`, `añadir`, `crear`
   - Navigates to: `/{locale}/workspace/clients/new`

5. **Abrir Agente** - Toggle AI assistant panel
   - Keywords: `agente`, `chat`, `asistente`, `ayuda`
   - Action: Opens right sidebar panel

### 📋 Recent Items

- **Lazy loaded**: Fetched only when palette opens
- **Combined view**: Shows recent policies and proposals together
- **Sorted by date**: Most recent first
- **Limit**: 8 items displayed
- **Visual indicators**: Icons and metadata for each type

## Technical Implementation

### Files

- **Component**: `src/components/CommandPalette.tsx`
- **API Route**: `src/app/api/workspace/recents/route.ts`
- **Data Layer**: Uses `src/lib/data/workspace.ts` functions
- **Route Helpers**: `src/lib/routes/workspace.ts` for navigation

### Architecture

```
┌─────────────────────────────────────┐
│  User Presses Cmd/Ctrl+K            │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  CommandPalette Opens               │
│  - Keyboard listener active         │
│  - Lazy loads recents via API       │
│  - Fetches orgId if needed          │
└─────────────────┬───────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌──────────────┐   ┌──────────────┐
│ Quick Actions│   │   Recents    │
│ (Static)     │   │ (API Fetch)  │
└──────┬───────┘   └──────┬───────┘
       │                  │
       ▼                  ▼
┌─────────────────────────────────────┐
│  User Searches/Selects              │
│  - cmdk filtering                   │
│  - Arrow key navigation             │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Action Executed                    │
│  - Navigate to route                │
│  - Open dialog                      │
│  - Toggle panel                     │
└─────────────────────────────────────┘
```

### Data Flow

1. **On Open**:
   ```typescript
   // Fetch user/org context
   GET /api/auth/me → { orgId, userId }
   
   // Fetch recent items
   GET /api/workspace/recents → { policies[], proposals[] }
   ```

2. **Action Selection**:
   - PDF Upload: Opens dialog with `PdfUploader` component
   - Navigation: Uses `router.push()` with locale-aware paths
   - Agent: Toggles `rightOpen` state via Zustand

### Accessibility

- **ARIA labels**: All interactive elements labeled
- **Keyboard navigation**: Full arrow key support
- **Screen reader**: Proper announcements via VisuallyHidden
- **Focus management**: Auto-focus on search input
- **Escape handling**: Native Dialog escape support

### Performance

- **Lazy loading**: PdfUploader loaded only when needed
- **Conditional fetch**: Recents fetched only on first open
- **Optimized bundle**: Dynamic imports reduce initial load
- **Debounced search**: cmdk handles filtering efficiently

## Usage Examples

### For Developers

```typescript
// The palette is automatically available via global keyboard listener
// No manual integration needed in most cases

// To programmatically open (optional):
window.dispatchEvent(new Event("briki:cmdk"));
```

### For Power Users

**Common Workflows**:

1. **Quick PDF Analysis**
   ```
   Cmd+K → Type "pdf" → Enter → Drop file
   ```

2. **Start New Comparison**
   ```
   Cmd+K → Type "comp" → Enter
   ```

3. **Jump to Recent**
   ```
   Cmd+K → Type client name → Enter
   ```

4. **Open AI Assistant**
   ```
   Cmd+K → Type "agent" → Enter
   ```

## Configuration

### Adding New Actions

Edit `CommandPalette.tsx` and add to the `actions` array:

```typescript
{
  id: "my-action",
  label: "Mi Acción",
  icon: MyIcon,
  keywords: ["keyword1", "keyword2"],
  onSelect: () => {
    setOpen(false);
    // Your action logic
  },
}
```

### Modifying Recents Limit

Change the slice limit in `fetchData()`:

```typescript
setRecents(combined.slice(0, 10)); // Show 10 instead of 8
```

### API Route Limits

Edit `/api/workspace/recents/route.ts`:

```typescript
policies: policies.slice(0, 10), // Increase from 5
```

## Testing Checklist

- [ ] Cmd+K opens palette on Mac
- [ ] Ctrl+K opens palette on Windows/Linux
- [ ] Escape closes palette
- [ ] Arrow keys navigate items
- [ ] Search filters correctly
- [ ] All quick actions execute
- [ ] Recents load and are clickable
- [ ] PDF upload dialog works
- [ ] Agent panel toggles
- [ ] Screen reader announces items
- [ ] Mobile/tablet behavior (touch)

## Known Limitations

1. **Offline**: Recents won't load without network
2. **First load**: Small delay while fetching orgId
3. **Session**: Requires authenticated session
4. **Mobile**: Touch devices need tap, no keyboard shortcut

## Future Enhancements

- [ ] Recent searches/commands
- [ ] Custom keyboard shortcuts per action
- [ ] Command history
- [ ] Fuzzy matching improvements
- [ ] Recent clients (not just cases)
- [ ] Breadcrumb navigation
- [ ] Multi-step commands


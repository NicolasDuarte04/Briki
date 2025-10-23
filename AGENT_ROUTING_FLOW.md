# Agent Routing Flow Diagram

Visual reference for understanding the complete agent routing architecture.

---

## Route Tree

```
/[locale]/
├── (marketing)/                    # Unauthenticated routes
│   └── page.tsx                    → Landing page
│
└── (app)/                          # Authenticated routes (with sidebar)
    ├── dashboard/
    │   └── page.tsx                → Dashboard home
    │
    └── agent/
        ├── page.tsx                → Agent workspace (two-pane)
        │                             • No thread selected
        │                             • Shows landing state
        │
        └── [threadId]/
            └── page.tsx            → Agent workspace (two-pane)
                                      • Specific thread selected
                                      • Shows conversation
```

---

## Navigation Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐
│ /es/dashboard│
│             │
│ ┌─────────┐ │
│ │ Sidebar │ │
│ │         │ │
│ │ Agente  │◄────── Click "Agente" menu item
│ └─────────┘ │
└──────┬──────┘
       │
       │ router.push(pathForAgent('es'))
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ /es/agent                                               │
│                                                         │
│ ┌──────────────────┐  ┌──────────────────────────────┐ │
│ │  Thread List     │  │  Chat Pane                   │ │
│ │                  │  │                              │ │
│ │  • Thread 1      │  │  Welcome/Landing State       │ │
│ │  • Thread 2      │  │                              │ │
│ │  • Thread 3 ◄────┼──┼──── Click thread            │ │
│ │                  │  │                              │ │
│ └──────────────────┘  └──────────────────────────────┘ │
└───────────┬─────────────────────────────────────────────┘
            │
            │ router.push(pathForAgentThread('case-123', 'es'))
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│ /es/agent/case-123                                      │
│                                                         │
│ ┌──────────────────┐  ┌──────────────────────────────┐ │
│ │  Thread List     │  │  Chat Pane                   │ │
│ │                  │  │                              │ │
│ │  • Thread 1      │  │  ┌────────────────────────┐ │ │
│ │  • Thread 2      │  │  │ Conversation Messages  │ │ │
│ │  ▶ Thread 3      │  │  │                        │ │ │
│ │    (selected)    │  │  │ User: Hello            │ │ │
│ │                  │  │  │ AI: Hi there!          │ │ │
│ └──────────────────┘  │  │                        │ │ │
│                       │  └────────────────────────┘ │ │
│                       └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
(app)/layout.tsx
│
├── Sidebar
│   └── SidebarNav
│       └── Agent Link
│           • href={pathForAgent(locale)}
│           • Uses <Link> component
│           • No <a> tags
│
└── Page Content
    │
    ├── /agent/page.tsx
    │   └── <HomeClient initialStep="landing" />
    │       • Two-pane UI
    │       • No thread selected
    │       • Shows welcome state
    │
    └── /agent/[threadId]/page.tsx
        └── <HomeClient initialStep="conversation" />
            • Two-pane UI
            • Auto-selects threadId
            • Shows conversation
```

---

## Data Flow

```
┌──────────────────────────────────────────────────────────┐
│ User clicks thread in list                               │
└───────────────┬──────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│ handleChatClick(caseId)                                  │
│ • In SidebarChatPanel.tsx                                │
└───────────────┬──────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│ router.push(pathForAgentThread(caseId, locale))          │
│ • Navigates to /es/agent/<caseId>                        │
└───────────────┬──────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│ /agent/[threadId]/page.tsx loads                         │
└───────────────┬──────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│ useEffect hooks run:                                     │
│ 1. fetchCases() - Load all cases                         │
│ 2. Validate threadId exists                              │
│ 3. setCurrentCaseId(threadId)                            │
│ 4. setStep('conversation')                               │
└───────────────┬──────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│ <HomeClient initialStep="conversation" /> renders        │
│ • Global state (useUI) has currentCaseId set             │
│ • Conversation view shows selected thread                │
└──────────────────────────────────────────────────────────┘
```

---

## Path Builder Functions

```typescript
// Single source of truth: src/lib/routes/workspace.ts

┌─────────────────────────────────────────────────────────┐
│ pathForAgent(locale)                                    │
│ ────────────────────────────────────────────────────────│
│ Input:  'es'                                            │
│ Output: '/es/agent'                                     │
│                                                         │
│ Input:  'en'                                            │
│ Output: '/en/agent'                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ pathForAgentThread(threadId, locale)                    │
│ ────────────────────────────────────────────────────────│
│ Input:  'case-123', 'es'                                │
│ Output: '/es/agent/case-123'                            │
│                                                         │
│ Input:  'case-456', 'en'                                │
│ Output: '/en/agent/case-456'                            │
└─────────────────────────────────────────────────────────┘
```

---

## State Management

```
Global UI State (Zustand)
├── currentCaseId: string | null
│   └── Controls which thread is active
│
├── step: 'landing' | 'conversation' | ...
│   └── Controls which view is shown
│
└── cases: Case[]
    └── List of all available threads

┌────────────────────────────────────────────────┐
│ State Transitions                              │
├────────────────────────────────────────────────┤
│ /es/agent                                      │
│ • currentCaseId: null                          │
│ • step: 'landing'                              │
│                                                │
│ /es/agent/case-123                             │
│ • currentCaseId: 'case-123'                    │
│ • step: 'conversation'                         │
└────────────────────────────────────────────────┘
```

---

## Edge Cases & Validation

```
┌─────────────────────────────────────────────────────────┐
│ Case 1: Invalid Thread ID                              │
├─────────────────────────────────────────────────────────┤
│ User visits: /es/agent/nonexistent-123                  │
│                                                         │
│ Flow:                                                   │
│ 1. Page loads                                           │
│ 2. useEffect validates threadId                         │
│ 3. Thread not found in cases[]                          │
│ 4. console.warn("Thread not found...")                  │
│ 5. router.replace(pathForAgent(locale))                 │
│ 6. Redirects to /es/agent                               │
│                                                         │
│ Result: Graceful fallback, no crash                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Case 2: Missing Thread ID Parameter                    │
├─────────────────────────────────────────────────────────┤
│ User visits: /es/agent/                                 │
│                                                         │
│ Flow:                                                   │
│ 1. Next.js routing resolves to /agent/page.tsx         │
│ 2. Base agent workspace renders                        │
│ 3. No redirect needed                                   │
│                                                         │
│ Result: Shows landing state                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Case 3: Direct URL Entry                               │
├─────────────────────────────────────────────────────────┤
│ User types: /es/agent/case-123                          │
│                                                         │
│ Flow:                                                   │
│ 1. Page loads fresh (no client-side nav)               │
│ 2. useEffect fetches cases                              │
│ 3. Validates threadId exists                            │
│ 4. Sets state: currentCaseId + step                     │
│ 5. Renders conversation                                 │
│                                                         │
│ Result: Deep linking works perfectly                    │
└─────────────────────────────────────────────────────────┘
```

---

## Locale Support

```
Spanish (es) - Default
├── /es/agent           → "Agente" in sidebar
└── /es/agent/case-123  → "Agente" highlighted

English (en)
├── /en/agent           → "Agent" in sidebar
└── /en/agent/case-123  → "Agent" highlighted

┌────────────────────────────────────────────────┐
│ How locale is determined:                      │
├────────────────────────────────────────────────┤
│ 1. useLocale() hook from next-intl             │
│ 2. Reads from URL pathname                     │
│ 3. Fallback to DEFAULT_LOCALE ('es')           │
└────────────────────────────────────────────────┘
```

---

## Active State Detection

```typescript
// In SidebarNav.tsx

const isLinkActive = (link) => {
  const pathWithoutLocale = pathname.replace(`/${locale}`, '');
  
  // Exact match
  if (pathWithoutLocale === link.matchPath) {
    return true;  // /agent === /agent ✓
  }
  
  // Nested routes
  if (pathWithoutLocale.startsWith(link.matchPath + '/')) {
    return true;  // /agent/case-123 starts with /agent/ ✓
  }
  
  return false;
}

┌────────────────────────────────────────────────┐
│ Examples:                                      │
├────────────────────────────────────────────────┤
│ Current: /es/agent                             │
│ Match:   /agent                                │
│ Result:  ✅ Active                             │
│                                                │
│ Current: /es/agent/case-123                    │
│ Match:   /agent                                │
│ Result:  ✅ Active (nested)                    │
│                                                │
│ Current: /es/dashboard                         │
│ Match:   /agent                                │
│ Result:  ❌ Not active                         │
└────────────────────────────────────────────────┘
```

---

## Performance Considerations

```
✅ Client-side navigation
   • Uses Next.js <Link> component
   • No full page reloads
   • Prefetching enabled

✅ State persistence
   • Zustand global state
   • No prop drilling
   • Minimal re-renders

✅ Code splitting
   • Each route is its own chunk
   • Lazy loading where appropriate

✅ Locale handling
   • Single useLocale() call
   • No repeated parsing
   • Centralized configuration
```

---

## Security & Validation

```
┌────────────────────────────────────────────────┐
│ Route Protection                               │
├────────────────────────────────────────────────┤
│ • All agent routes under (app) layout          │
│ • Middleware checks authentication             │
│ • Redirects to /login if not authenticated     │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ Thread Access Validation                       │
├────────────────────────────────────────────────┤
│ • Validates threadId exists in user's cases    │
│ • Prevents accessing other users' threads      │
│ • Graceful redirect if invalid                 │
└────────────────────────────────────────────────┘
```

---

## Accessibility Features

```
✅ Semantic Navigation
   • <nav> element for sidebar
   • <Link> for proper navigation
   • aria-current="page" for active items

✅ Keyboard Support
   • Tab navigation works
   • Enter activates links
   • Focus visible styles

✅ Screen Reader Support
   • aria-label on all links
   • Descriptive link text
   • Proper heading hierarchy

✅ Visual Indicators
   • Active state clearly visible
   • Focus states prominent
   • High contrast colors
```

---

## Testing Matrix

| Scenario | Route | Expected Behavior | Status |
|----------|-------|-------------------|--------|
| Click sidebar | /es/agent | Render workspace | ✅ |
| Click thread | /es/agent/case-123 | Show conversation | ✅ |
| Direct URL | /es/agent | Render workspace | ✅ |
| Deep link | /es/agent/case-123 | Show specific thread | ✅ |
| Invalid ID | /es/agent/bad-id | Redirect to /es/agent | ✅ |
| Locale switch | /en/agent | English labels | ✅ |
| No auth | /es/agent | Redirect to login | ✅ |
| Refresh page | /es/agent/case-123 | Stay on same thread | ✅ |

---

**Created:** October 20, 2025  
**Purpose:** Visual reference for agent routing architecture  
**Audience:** Developers, QA, Product


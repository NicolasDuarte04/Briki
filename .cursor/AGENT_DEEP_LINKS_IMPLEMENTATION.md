# Agent Thread Deep Links Implementation

**Status**: ✅ Complete  
**Difficulty**: Medium  
**Date**: 2025-10-20

## Overview

Implemented deep linking functionality for agent threads, allowing users to navigate directly to specific conversations via URL.

## Changes Made

### 1. Created Dynamic Route (`src/app/[locale]/(app)/agent/[threadId]/page.tsx`)

**New file** that handles deep linking to specific agent threads.

**Key Features**:
- Client component using Next.js App Router dynamic routes
- Validates thread exists before selecting it
- Automatically sets the active case/thread in global state
- Redirects to base `/agent` page if thread is invalid
- Uses the same `HomeClient` component as the base agent page
- Respects locale routing via `next-intl`

**How it works**:
1. Extracts `threadId` from URL params
2. Fetches available cases/threads
3. Validates the thread exists in the user's cases
4. Sets `currentCaseId` in UI state (Zustand)
5. Switches to `conversation` step
6. Renders `HomeClient` which shows the conversation view

### 2. Updated `SidebarChatPanel.tsx`

**Modified**: `handleChatClick` function (line ~106-109)

**Before**:
```tsx
const handleChatClick = (caseId: string) => {
  router.push(pathForCase(caseId, locale));
};
```

**After**:
```tsx
const handleChatClick = (caseId: string) => {
  // Navigate to agent thread deep link
  router.push(`/${locale}/agent/${caseId}`);
};
```

**Why**: Ensures clicking on a chat in the sidebar navigates to the deep link URL instead of the old case detail page.

### 3. Updated `ConversationPane.tsx`

**Modified**: Added thread switching logic (lines ~35, 42, 373-392)

**New State**:
- `currentCaseId` - pulled from UI state
- `loadedThreadId` - tracks which thread is currently loaded

**New Effect**:
```tsx
useEffect(() => {
  if (currentCaseId !== loadedThreadId) {
    // Reset messages when thread changes
    setMessages([]);
    setLoadedThreadId(currentCaseId);
    
    // Show welcome message for new thread
    if (currentCaseId) {
      const welcomeMessage: ChatMessage = {
        role: "assistant",
        content: "Hola, estoy aquí para ayudarte con este caso. ¿En qué puedo asistirte?",
        agent: { label: chatTranslations("agents.sourcing") },
        id: `welcome-${currentCaseId}`
      };
      setMessages([welcomeMessage]);
    }
  }
}, [currentCaseId, loadedThreadId, chatTranslations]);
```

**Why**: Ensures the conversation view resets/reloads when switching between threads via deep links.

**Note**: Currently messages are stored in local state and reset when switching threads. Future enhancement would be to persist messages in the database and load them when a thread is selected.

## URL Structure

- **Base agent page**: `/{locale}/agent`
- **Specific thread**: `/{locale}/agent/{threadId}`

Examples:
- `/en/agent` - Shows landing/welcome screen
- `/en/agent/abc123` - Opens conversation with thread ID "abc123"
- `/es/agent/xyz789` - Opens conversation with thread ID "xyz789" (Spanish locale)

## State Management

Uses Zustand UI state (`useUI`):
- `currentCaseId`: Stores the active thread/case ID
- `setCurrentCaseId(id)`: Sets the active thread
- `setStep(step)`: Controls which UI view is shown
- `cases`: List of available threads/cases
- `fetchCases()`: Loads threads from the API

## Navigation Flow

### Opening a Thread from Sidebar
1. User clicks on a chat in `SidebarChatPanel`
2. Router navigates to `/agent/{threadId}`
3. `AgentThreadPage` component mounts
4. Component validates thread exists
5. Sets `currentCaseId` in state
6. `ConversationPane` detects change and resets messages
7. User sees conversation view for that thread

### Direct URL Access
1. User visits `/agent/{threadId}` directly
2. Same validation and loading flow as above
3. If thread doesn't exist, redirects to `/agent`

### Back/Forward Navigation
1. Browser history includes `/agent/{threadId}` URLs
2. Back button navigates to previous thread
3. Each navigation updates `currentCaseId`
4. `ConversationPane` automatically reloads for the new thread

## Acceptance Tests

### ✅ Test 1: Navigate to specific thread
**Steps**:
1. Visit `/{locale}/agent/{someThreadId}` where `someThreadId` is a valid case ID
2. Verify: Lands on Agent screen with conversation view
3. Verify: Thread is selected and conversation is shown
4. Verify: URL shows `/agent/{someThreadId}`

### ✅ Test 2: Back/forward navigation
**Steps**:
1. Navigate to `/agent/thread1`
2. Navigate to `/agent/thread2`
3. Click browser back button
4. Verify: Returns to thread1 and URL is `/agent/thread1`
5. Click browser forward button
6. Verify: Returns to thread2 and URL is `/agent/thread2`

### ✅ Test 3: Invalid thread redirects
**Steps**:
1. Visit `/agent/nonexistent-thread-id`
2. Verify: Redirects to `/agent`
3. Verify: Console shows warning message

### ✅ Test 4: Click thread from sidebar
**Steps**:
1. Open chat panel (sidebar)
2. Click on any thread/case
3. Verify: URL changes to `/agent/{threadId}`
4. Verify: Conversation view opens for that thread

## Future Enhancements

1. **Message Persistence**: Store chat messages in database
   - Add `Message` model to Prisma schema
   - Create API endpoint to fetch messages for a thread
   - Load historical messages in `ConversationPane` when thread changes

2. **Thread Metadata**: Show thread title in URL or page title
   - Update document.title when thread changes
   - Show thread name in navigation breadcrumb

3. **Thread Loading States**: Add loading indicators
   - Show skeleton while fetching thread data
   - Handle thread loading errors gracefully

4. **Optimistic Updates**: Update URL immediately on click
   - Use `router.push` before validation completes
   - Show loading state while validating

5. **Share Links**: Generate shareable thread URLs
   - Add "Share" button to copy thread URL
   - Support sharing specific messages within thread

## Technical Notes

- Uses Next.js 14 App Router dynamic routes
- Client component (`"use client"`) required for hooks
- Locale routing handled by `next-intl`
- State management via Zustand (`useUI`)
- No database schema changes required (for now)
- Fully type-safe with TypeScript

## Files Changed

1. ✅ `src/app/[locale]/(app)/agent/[threadId]/page.tsx` (NEW)
2. ✅ `src/components/SidebarChatPanel.tsx` (MODIFIED)
3. ✅ `src/components/Chat/ConversationPane.tsx` (MODIFIED)

## Linter Status

✅ All files pass linter with no errors


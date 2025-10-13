# Chat URL Routing Implementation

## Overview

The chat system now uses URL-based routing to reflect the active conversation, enabling proper browser navigation and state persistence across page refreshes.

## Implementation Details

### 1. Dynamic Route
- **Path**: `/[locale]/(marketing)/chat/[id]/page.tsx`
- Passes the conversation ID from the URL to `HomeClient`
- Enables direct linking to specific conversations

### 2. HomeClient URL Synchronization
**File**: `src/components/HomeClient.tsx`

The component now:
- Accepts an optional `conversationId` prop from the URL
- Syncs the URL with the active conversation on mount
- Creates a new conversation if none exists and updates the URL
- Validates that URL conversations exist before setting them active
- Pushes URL changes when the active conversation changes

**Key behaviors**:
- On mount with valid `conversationId`: Sets it as active
- On mount with invalid `conversationId`: Creates new conversation and replaces URL
- On mount without `conversationId`: Uses existing active or creates new one
- When `activeConversationId` changes: Pushes new URL

### 3. Sidebar Navigation
**File**: `src/components/SidebarNav.tsx`

Updated to:
- Use `useRouter()` from Next.js navigation
- Push URL when "New Chat" is clicked
- Push URL when clicking on existing conversations
- Maintains both store state and URL state in sync

### 4. Chat Component
**File**: `src/components/Chat/BrikiChat.tsx`

Changes:
- Removed automatic conversation creation on mount (now handled by `HomeClient`)
- Pushes URL when creating a conversation during message send
- Ensures conversation exists before sending messages

## Expected Behavior

### ✅ New Chat Creation
1. Click "New Chat" in sidebar
2. URL updates to `/chat/[new-id]`
3. New conversation is created and set as active
4. Empty chat interface is displayed

### ✅ Selecting Existing Chat
1. Click on a conversation in the sidebar
2. URL updates to `/chat/[conversation-id]`
3. Conversation messages are displayed
4. Browser back button works to return to previous chat

### ✅ Page Refresh
1. User is in a conversation at `/chat/[id]`
2. Refresh the page
3. Same conversation is displayed
4. URL remains at `/chat/[id]`

### ✅ Back/Forward Navigation
1. Navigate through multiple conversations
2. Use browser back button
3. Returns to previous conversation
4. Use browser forward button
5. Moves to next conversation in history

### ✅ Direct URL Access
1. Copy a chat URL (e.g., `/chat/abc-123`)
2. Paste in new tab or share with others
3. If conversation exists: Loads that conversation
4. If conversation doesn't exist: Creates new conversation and redirects

### ✅ Landing to Conversation
1. Start on landing page (`/`)
2. Submit initial message
3. Transitions to conversation mode
4. URL updates to `/chat/[new-id]`

## Testing Checklist

- [ ] New chat button creates conversation and updates URL
- [ ] Clicking sidebar conversations updates URL
- [ ] Page refresh maintains current conversation
- [ ] Browser back button navigates to previous chat
- [ ] Browser forward button navigates to next chat
- [ ] Invalid conversation ID in URL redirects to new chat
- [ ] Direct URL access to valid conversation works
- [ ] Direct URL access to invalid conversation creates new one
- [ ] No duplicate conversations are created
- [ ] URL always reflects the active conversation

## Technical Notes

### Race Condition Prevention
The implementation uses `router.replace()` for initial URL sync to avoid adding unnecessary history entries, and `router.push()` for user-initiated navigation to properly manage browser history.

### Hydration Strategy
- `HomeClient` checks URL params first
- Validates conversation exists in store
- Falls back to creating new conversation if needed
- Uses `replace` for corrections, `push` for user actions

### Store and URL Sync
Both the Zustand store (`useChatStore`) and URL state are kept in sync:
1. URL changes trigger store updates (via `setActiveConversation`)
2. Store changes trigger URL updates (via `router.push`)
3. Effects are guarded to prevent infinite loops

## Future Enhancements

1. **Query Parameters**: Add support for `?message=...` to pre-fill chat
2. **Conversation Slugs**: Use friendly slugs instead of UUIDs (e.g., `/chat/insurance-claim-discussion`)
3. **Shareable Links**: Implement conversation sharing with access controls
4. **URL Persistence**: Save conversation state to backend for cross-device access
5. **Deep Linking**: Support linking to specific messages within a conversation

## Troubleshooting

### Issue: URL doesn't update when switching chats
- Check that `router.push()` is called in `SidebarNav.handleChatClick()`
- Verify `useRouter` is imported from `next/navigation`

### Issue: Refresh creates duplicate conversations
- Ensure `HomeClient` uses `router.replace()` for initial sync
- Check that conversation existence is validated before creation

### Issue: Back button doesn't work
- Verify `router.push()` is used (not `router.replace()`) for user navigation
- Check browser console for navigation errors

### Issue: Infinite loop / too many renders
- Review effect dependencies in `HomeClient`
- Ensure URL path check prevents redundant pushes


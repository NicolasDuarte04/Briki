# Agent Routing - Manual Test Checklist

**Purpose:** Validate end-to-end agent routing behavior after Prompts 1-3  
**Estimated Time:** 5 minutes  
**Difficulty:** Easy

---

## Pre-Test Setup

1. ✅ Ensure dev server is running: `npm run dev`
2. ✅ Log in to the application
3. ✅ Have at least one test case/thread created (if not, create one via chat panel)

---

## Test 1: Navigate from Dashboard to Agent

### Steps:
1. Navigate to `/es/dashboard`
2. Look at the sidebar on the left
3. Click the "**Agente**" (or "**Agent**") menu item

### Expected Results:
- ✅ URL changes to `/es/agent`
- ✅ Two-pane workspace appears:
  - **Left pane:** List of threads/cases
  - **Right pane:** Chat interface
- ✅ No page reload (smooth client-side navigation)
- ✅ "Agente" menu item is highlighted/active

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 2: Click Thread in List

### Steps:
1. From `/es/agent`, look at the left pane with thread list
2. Click on any thread/case in the list

### Expected Results:
- ✅ URL changes to `/es/agent/<threadId>` (e.g., `/es/agent/case-123`)
- ✅ Right pane updates to show the selected thread's conversation
- ✅ Thread becomes highlighted in the left pane
- ✅ "Agente" menu item remains highlighted
- ✅ No page reload

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

### Note the Thread ID:
- Thread ID: `_______________`

---

## Test 3: Manual URL Visit to Base Agent

### Steps:
1. Click in the browser address bar
2. Type or paste: `/es/agent`
3. Press Enter

### Expected Results:
- ✅ Same two-pane workspace renders
- ✅ Left pane shows thread list
- ✅ Right pane shows landing/welcome state (no thread selected)
- ✅ "Agente" menu item is highlighted
- ✅ No redirect occurs

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 4: Manual URL Visit to Thread Deep Link

### Steps:
1. Click in the browser address bar
2. Type or paste: `/es/agent/<threadId>` (use the thread ID from Test 2)
3. Press Enter

### Expected Results:
- ✅ Two-pane workspace renders
- ✅ The specific thread is automatically selected
- ✅ Right pane shows that thread's conversation
- ✅ URL stays as `/es/agent/<threadId>`
- ✅ No redirect occurs

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 5: No Marketing Redirects

### Steps:
1. While on `/es/agent` or `/es/agent/<threadId>`:
   - Refresh the page (Cmd+R / Ctrl+R)
   - Navigate away and back using browser history
   - Click different sidebar items and return to Agent

### Expected Results:
- ✅ Always stays within the app (never redirects to marketing landing page)
- ✅ Authentication persists
- ✅ Sidebar remains visible
- ✅ Top header remains visible

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 6: Locale Switching (Bonus)

### Steps:
1. Navigate to `/en/agent` (English locale)
2. Check the sidebar

### Expected Results:
- ✅ Menu item shows "**Agent**" (English)
- ✅ URL is `/en/agent`
- ✅ Everything works the same as Spanish

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 7: Invalid Thread ID (Edge Case)

### Steps:
1. Navigate to `/es/agent/invalid-thread-id-123456789`

### Expected Results:
- ✅ Redirects to `/es/agent`
- ✅ Console shows warning: "Thread invalid-thread-id-123456789 not found, redirecting to /agent"
- ✅ No error/crash
- ✅ Thread list still visible

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 8: Click Thread from Chat Panel (Bonus)

### Steps:
1. From `/es/dashboard`, click the "Chat" button in sidebar
2. Chat panel opens on the right
3. Click on any thread in the chat panel

### Expected Results:
- ✅ Navigates to `/es/agent/<threadId>`
- ✅ Chat panel closes
- ✅ Agent workspace opens with that thread selected

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Browser Console Checks

### During all tests, check browser console for:
- ✅ No errors
- ✅ No warnings (except expected "Thread not found" in Test 7)
- ✅ No infinite loops
- ✅ No unnecessary re-renders

### Console Issues Found:
- [ ] None (all clean)
- [ ] Issues (describe):

---

## Accessibility Checks (Quick)

### Keyboard Navigation:
1. Tab through the sidebar menu items
2. Press Enter on "Agente"

### Expected:
- ✅ Focus visible on all items
- ✅ Enter key navigates correctly
- ✅ Active state clearly visible

### Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Performance Checks

### Navigation Speed:
- [ ] Navigation feels instant (< 200ms)
- [ ] No loading spinners between views
- [ ] Smooth transitions

### Results:
- [ ] Excellent
- [ ] Good
- [ ] Needs improvement (describe):

---

## Summary

### Total Tests: 8
### Passed: ___
### Failed: ___

### Overall Status:
- [ ] ✅ All tests passed - Ready for production
- [ ] ⚠️ Minor issues - Document and proceed
- [ ] ❌ Critical failures - Needs fixes

### Notes:
```
[Add any observations, edge cases found, or suggestions]
```

---

## Sign-off

- **Tested by:** _______________
- **Date:** _______________
- **Browser(s):** _______________
- **Approval:** [ ] Approved [ ] Rejected

---

## Quick Command Reference

```bash
# Start dev server
npm run dev

# Run automated routing tests
node scripts/verify-agent-routing.js

# Check for linting issues
npm run lint
```

---

## Troubleshooting

### Issue: "Agente" link not visible in sidebar
**Solution:** Ensure you're logged in and on an authenticated route

### Issue: Thread list is empty
**Solution:** Create a test thread by opening chat panel and sending a message

### Issue: URL doesn't change on navigation
**Solution:** Check browser console for errors, ensure JavaScript is enabled

### Issue: Gets redirected to login
**Solution:** Session may have expired, log in again

---

**Documentation Created:** October 20, 2025  
**Last Updated:** October 20, 2025


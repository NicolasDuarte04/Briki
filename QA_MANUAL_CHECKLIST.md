# Manual QA Checklist - Agent Chat Integration

Use this checklist to manually verify the agent chat integration in a browser.

---

## 🎯 Pre-Test Setup

- [ ] Start dev server: `pnpm dev`
- [ ] Open browser at `http://localhost:3000`
- [ ] Have browser DevTools open (Console & Elements tabs)
- [ ] Test in both light and dark mode
- [ ] Test on desktop (1920x1080) and mobile (375x667) viewports

---

## ✅ Layout & Scroll (Desktop)

### Center Column Scroll
- [ ] Navigate to `/chat/{id}` or start a conversation
- [ ] Add multiple messages until content exceeds viewport height
- [ ] **PASS IF:** Only the center column scrolls, composer stays sticky at bottom
- [ ] **FAIL IF:** Entire page scrolls OR multiple scroll bars appear

### Composer Sticky Behavior
- [ ] Scroll to top of message history
- [ ] **PASS IF:** Composer remains visible at bottom of center column
- [ ] **FAIL IF:** Composer scrolls out of view OR overlaps messages

### No Double Scroll
- [ ] With long conversation, try to scroll in message area
- [ ] Check for nested scrollbars in DevTools
- [ ] **PASS IF:** Single vertical scrollbar in center column only
- [ ] **FAIL IF:** Scrollbar inside scrollbar OR jerky scroll behavior

### No Horizontal Scroll
- [ ] Resize browser window from 1920px down to 320px width
- [ ] Send messages with long words (e.g., "supercalifragilisticexpialidocious")
- [ ] **PASS IF:** No horizontal scrollbar at any width, text wraps correctly
- [ ] **FAIL IF:** Horizontal scrollbar appears OR content cut off

---

## ✅ Sidebar Chat Management

### Active State
- [ ] Create 2-3 conversations
- [ ] Click between conversations in sidebar
- [ ] **PASS IF:** Active conversation has distinct background color and bold title
- [ ] **FAIL IF:** No visual indication OR multiple conversations appear active

### New Chat Creation
- [ ] Click "+" button in sidebar header
- [ ] Check URL in address bar
- [ ] **PASS IF:** New chat appears at top of sidebar, URL is `/chat/{newId}`, titled "New chat"
- [ ] **FAIL IF:** No new chat created OR URL doesn't update OR duplicate IDs

### Conversation Switching
- [ ] Send a message in Conversation A
- [ ] Switch to Conversation B
- [ ] Switch back to Conversation A
- [ ] **PASS IF:** Instant switch, message history preserved, no loading spinner
- [ ] **FAIL IF:** Delay > 200ms OR messages disappear OR wrong conversation loads

### Title Auto-Generation
- [ ] Create new chat
- [ ] Send first message: "Help me analyze this insurance policy"
- [ ] Check sidebar after assistant response
- [ ] **PASS IF:** Title updates to "Help me analyze this insurance polic…" (truncated at ~48 chars)
- [ ] **FAIL IF:** Still says "New chat" OR title is wrong OR too long

---

## ✅ Agent Theme Parity

### Design Token Usage
- [ ] Toggle between light and dark mode (if available)
- [ ] Inspect element colors in DevTools
- [ ] **PASS IF:** All colors are CSS custom properties (e.g., `var(--border)`)
- [ ] **FAIL IF:** Hardcoded hex colors like `#000000` found

### Composer Border
- [ ] Focus on the composer at bottom
- [ ] Look at the top edge of the composer
- [ ] **PASS IF:** Subtle 1px border at top, no heavy shadow or floating effect
- [ ] **FAIL IF:** No border OR thick border OR drop shadow

### Spacing & Radius Consistency
- [ ] Measure spacing between messages (should be ~1rem / 16px)
- [ ] Check border radius on composer, buttons, messages
- [ ] **PASS IF:** Consistent rounded corners (~10px), equal spacing between elements
- [ ] **FAIL IF:** Mixed border radii OR uneven spacing

---

## ✅ Keyboard Controls

### Enter to Send
- [ ] Click in composer textarea
- [ ] Type "Test message"
- [ ] Press `Enter` (without Shift)
- [ ] **PASS IF:** Message sends immediately, textarea clears, no newline inserted
- [ ] **FAIL IF:** Newline inserted OR nothing happens

### Shift+Enter for Newline
- [ ] Click in composer textarea
- [ ] Type "Line 1"
- [ ] Press `Shift+Enter`
- [ ] Type "Line 2"
- [ ] **PASS IF:** Cursor moves to new line, textarea expands vertically
- [ ] **FAIL IF:** Message sends OR newline not inserted

### Textarea Auto-Expand
- [ ] Type or paste long message (10+ lines)
- [ ] **PASS IF:** Textarea expands up to max height (~200px), then scrolls internally
- [ ] **FAIL IF:** Textarea doesn't expand OR expands infinitely

### Focus Management
- [ ] Load `/chat/{id}` page
- [ ] Wait 500ms
- [ ] **PASS IF:** Cursor is in composer textarea, ready to type
- [ ] **FAIL IF:** Focus elsewhere OR need to click to focus

### Tab Navigation
- [ ] Press `Tab` repeatedly from composer
- [ ] **PASS IF:** Logical order: composer → send button → agent selector → file attach → image attach → sidebar
- [ ] **FAIL IF:** Illogical order OR focus trap OR invisible elements focused

---

## ✅ Landing Page Integrity

### Landing Page Unchanged
- [ ] Navigate to `/` (landing page)
- [ ] Check hero section, features, CTA, footer
- [ ] **PASS IF:** Layout and styles identical to before agent chat integration
- [ ] **FAIL IF:** Broken styles OR missing elements OR layout shifts

### Landing Chat Composer
- [ ] Scroll to hero section on landing page
- [ ] Type message in dark-themed chat input
- [ ] Press Enter
- [ ] **PASS IF:** Redirects to `/chat/{id}` with message sent OR prompts login if not authenticated
- [ ] **FAIL IF:** Error thrown OR nothing happens OR wrong page

### Contact Form
- [ ] Scroll to bottom of landing page
- [ ] Fill out contact form with test data
- [ ] Submit form
- [ ] **PASS IF:** Success message appears, form clears, no console errors
- [ ] **FAIL IF:** Form broken OR submission fails OR no feedback

---

## ✅ Mobile & Tablet (Responsive)

### Viewport: 375x667 (iPhone SE)
- [ ] Resize browser to 375px width
- [ ] Navigate to `/chat/{id}`
- [ ] **PASS IF:** Layout stacks vertically, sidebar collapses to hamburger menu
- [ ] **FAIL IF:** Horizontal scroll OR overlapping content OR unusable

### Sidebar Collapse
- [ ] On mobile, tap hamburger icon (if visible)
- [ ] **PASS IF:** Sidebar slides in from left, tapping outside closes it
- [ ] **FAIL IF:** Sidebar doesn't appear OR blocks entire screen

### Composer on Mobile
- [ ] Tap composer on mobile
- [ ] Type a message
- [ ] **PASS IF:** Keyboard appears, composer stays visible above keyboard, send button accessible
- [ ] **FAIL IF:** Composer hidden behind keyboard OR unusable

### Touch Targets
- [ ] Check size of buttons (send, attach, agent selector)
- [ ] **PASS IF:** All interactive elements ≥ 44x44px (Apple HIG / Material Design standard)
- [ ] **FAIL IF:** Buttons too small to tap accurately

### Viewport: 768x1024 (iPad)
- [ ] Resize browser to 768px width
- [ ] **PASS IF:** Layout similar to desktop OR intelligently adapts
- [ ] **FAIL IF:** Broken layout OR weird spacing

---

## ✅ Additional Checks

### Console Errors
- [ ] Open DevTools Console
- [ ] Navigate through entire app flow
- [ ] **PASS IF:** No red errors in console (warnings OK)
- [ ] **FAIL IF:** JavaScript errors OR React hydration warnings

### Network Requests
- [ ] Open DevTools Network tab
- [ ] Send a message
- [ ] **PASS IF:** POST to `/api/chat/process-message` returns 200 OK
- [ ] **FAIL IF:** 500 error OR timeout OR CORS issues

### Auto-Scroll Behavior
- [ ] Scroll up in long conversation
- [ ] Send a new message
- [ ] **PASS IF:** "Jump to newest" button appears, clicking it scrolls to bottom
- [ ] **FAIL IF:** Auto-scrolls even when user scrolled up OR button doesn't work

### Jump to Newest Button
- [ ] Trigger "Jump to newest" button by scrolling up
- [ ] Click the button
- [ ] **PASS IF:** Smooth scroll to bottom, button disappears
- [ ] **FAIL IF:** Instant jump (no animation) OR button persists

### Accessibility (a11y)
- [ ] Navigate entire app using only keyboard (no mouse)
- [ ] Use a screen reader (e.g., VoiceOver on Mac, NVDA on Windows)
- [ ] **PASS IF:** All interactive elements reachable, announcements make sense
- [ ] **FAIL IF:** Keyboard trap OR elements not announced OR illogical order

### Performance
- [ ] Create conversation with 50+ messages
- [ ] Scroll rapidly up and down
- [ ] **PASS IF:** Smooth 60fps scroll, no jank or lag
- [ ] **FAIL IF:** Stuttering OR frame drops OR memory leak (check DevTools Performance)

---

## 🐛 Issue Reporting Template

If you find a bug, use this template:

```markdown
**Issue:** [Brief description]
**Severity:** [Blocker / Critical / Major / Minor / Cosmetic]
**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected:** [What should happen]
**Actual:** [What actually happened]
**Screenshot/Video:** [If applicable]
**Browser:** [Chrome 120, Safari 17, etc.]
**Viewport:** [1920x1080, 375x667, etc.]
**Console Errors:** [Copy/paste any errors]
```

---

## ✅ Final Sign-Off

- [ ] All checks above passed
- [ ] No blocking or critical issues found
- [ ] Minor issues documented (if any)
- [ ] Ready for production deployment

**Tester Name:** _______________  
**Date:** _______________  
**Signature:** _______________  

---

## 📊 Summary

**Total Checks:** 50+  
**Passed:** ___ / ___  
**Failed:** ___ / ___  
**Issues Logged:** ___  

**Verdict:** ✅ PASS / ❌ FAIL / ⚠️ CONDITIONAL PASS

---

**Notes:**


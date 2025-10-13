# Landing Toolbar QA Testing Guide

**Component Under Test**: `BrikiChat` with `mode="landing"` and `mode="agent"`  
**Date**: October 12, 2025  
**Test Objective**: Verify landing toolbar (PDF/WhatsApp/Carriers) renders and functions correctly

---

## 🚀 Pre-Test Setup

### 1. Start Development Server
```bash
cd /Users/nicolasduarte/Briki\ 3.0/Briki
pnpm dev
```
Server should be running at: http://localhost:3000

### 2. Open Browser DevTools
- Chrome DevTools: `Cmd + Option + J` (Mac) or `F12` (Windows/Linux)
- Keep **Console** and **Network** tabs open throughout testing

### 3. Prepare Test Files
- ✅ Valid PDF file (any small PDF, 1-5 MB)
- ✅ Non-PDF file (e.g., `.txt`, `.jpg`) for error testing

---

## 📋 Test Scenarios

### ✅ Test 1: Render Verification

#### 1.1 Landing Mode - Button Visibility
**Steps:**
1. Navigate to: http://localhost:3000
2. Scroll to hero section with chat interface
3. Verify the following elements are visible:

**Expected Results:**
- [ ] Large dark textarea with placeholder: "Describe your client or drop a policy PDF..."
- [ ] Paperclip icon button (left side of bottom toolbar)
- [ ] Send button with up arrow (right side, disabled when empty)
- [ ] **Three action buttons below the chat box:**
  - [ ] "Upload PDF" button (FileUp icon)
  - [ ] "Import WhatsApp chat" button (ImageIcon) 
  - [ ] "Connect carriers" button (MonitorIcon)

**Screenshot Required:** `01-landing-buttons-visible.png`

**Console Check:**
- [ ] No errors in Console
- [ ] No 404s in Network tab

---

#### 1.2 Agent Mode - Minimal Composer
**Steps:**
1. From landing page, type any text in chat: "Test message"
2. Press Enter or click Send button
3. Should navigate to conversation view
4. Inspect the composer area at the bottom

**Expected Results:**
- [ ] Chat history visible at top
- [ ] Minimal composer at bottom (dark background)
- [ ] Single textarea input
- [ ] Single send button (right side)
- [ ] **NO action buttons** (Upload PDF, WhatsApp, Carriers should NOT appear)

**Screenshot Required:** `02-agent-minimal-composer.png`

---

### ✅ Test 2: PDF Upload Flow

#### 2.1 Happy Path - Successful Upload
**Steps:**
1. Go back to landing page: http://localhost:3000
2. Click "Upload PDF" button
3. File selector should open, showing only `.pdf` files
4. Select a valid PDF file (1-5 MB recommended)
5. Wait for upload to complete

**Expected Results:**

**During Upload:**
- [ ] Button text changes to "Uploading..."
- [ ] Button is disabled (opacity 50%, cursor not-allowed)
- [ ] Network tab shows `POST /api/upload/pdf` request

**Screenshot Required:** `03-uploading-state.png`

**After Upload:**
- [ ] Button shows "✓ PDF Loaded" with green background
- [ ] Green file indicator appears above toolbar showing:
  - File name (e.g., "policy.pdf")
  - File size in KB
  - Page count (e.g., "5 pages")
  - Remove button (X icon)
- [ ] Console shows successful extraction logs
- [ ] No errors in console

**Screenshot Required:** `04-uploaded-state.png`

**Console Logs to Verify:**
```
📁 Frontend: Abriendo selector de archivos...
📄 Frontend: Archivo seleccionado: policy.pdf application/pdf 12345
📡 Frontend: FormData creado
🚀 Frontend: Enviando a /api/upload/pdf...
📡 Frontend: Respuesta recibida: {success: true, ...}
📖 Texto extraído: [first 200 chars]...
✅ Archivo guardado en estado para envío
```

---

#### 2.2 Remove File
**Steps:**
1. With a file uploaded (from previous test)
2. Click the X button on the file indicator

**Expected Results:**
- [ ] File indicator disappears
- [ ] "Upload PDF" button returns to default state (no longer green)
- [ ] No errors in console

---

#### 2.3 Error Case - Non-PDF File
**Steps:**
1. Click "Upload PDF" button
2. Try to select a non-PDF file (change file type filter if needed)
3. Or manually trigger by selecting `.txt`, `.jpg`, etc.

**Expected Results:**
- [ ] File selector should only show PDFs (filter applied)
- [ ] If non-PDF somehow selected, should show error: "El archivo debe ser un PDF"
- [ ] Button returns to default state
- [ ] No crash or console errors

**Screenshot Required:** `05-error-non-pdf.png`

---

#### 2.4 Error Case - Network/Server Error
**Steps:**
1. Open DevTools → Network tab
2. Enable "Offline" mode (or throttle to Offline)
3. Click "Upload PDF" and select a valid PDF
4. Wait for error

**Alternative**: Stop the dev server temporarily

**Expected Results:**
- [ ] Alert or error message: "Error de conexión"
- [ ] Button returns to default state
- [ ] Upload state cleared properly

**Screenshot Required:** `06-error-network.png`

---

### ✅ Test 3: WhatsApp & Carriers Actions

#### 3.1 Unauthenticated - Redirect to Login
**Steps:**
1. Open http://localhost:3000 in **incognito/private window** (or logout if logged in)
2. Scroll to hero chat
3. Click "Import WhatsApp chat" button

**Expected Results:**
- [ ] Redirects to `/login` page
- [ ] No console errors
- [ ] No 404s in Network tab

**Repeat for:**
4. Go back to landing page
5. Click "Connect carriers" button

**Expected Results:**
- [ ] Also redirects to `/login`
- [ ] No console errors

**Screenshot Required:** `07-whatsapp-carriers-unauth.png` (showing redirect or login page)

---

#### 3.2 Authenticated - Navigation
**Steps:**
1. Login to the application
2. Navigate back to landing: http://localhost:3000
3. Click "Import WhatsApp chat" button

**Expected Results:**
- [ ] Navigates to conversation view (same as sending a message)
- [ ] Calls `setStep("conversation")`
- [ ] No console errors
- [ ] No 404 routes in Network tab

**Console Log to Verify:**
Should see state changes/navigation, no errors

4. Go back to landing
5. Click "Connect carriers" button

**Expected Results:**
- [ ] Same behavior: navigates to conversation view
- [ ] No errors

**Screenshot Required:** `08-whatsapp-carriers-auth-console.png` (Console showing clean execution)

---

### ✅ Test 4: UX & Accessibility

#### 4.1 Keyboard Navigation - Enter/Shift+Enter
**Steps:**
1. Go to landing page: http://localhost:3000
2. Click in the textarea
3. Type: "Line 1"
4. Press `Shift + Enter`
5. Type: "Line 2"
6. Press `Enter` (without Shift)

**Expected Results:**
- [ ] After Shift+Enter: new line created, message NOT sent
- [ ] After Enter: message sent, redirects to conversation view
- [ ] Text includes both lines

---

#### 4.2 Keyboard Focus - Tab Navigation
**Steps:**
1. Go to landing page
2. Press `Tab` repeatedly to navigate through interactive elements

**Expected Results:**
- [ ] Focus visible on each button (visual outline/ring)
- [ ] Tab order is logical: textarea → paperclip → send → Upload PDF → WhatsApp → Carriers
- [ ] Focus indicators clearly visible

**Screenshot Required:** `09-focus-states.png` (showing focus ring on a button)

---

#### 4.3 Button States - Enable/Disable Logic
**Steps:**
Test the Send button enable/disable states:

**Test Case A - Empty State:**
1. Textarea empty, no file uploaded
2. **Expected:** Send button disabled (gray/muted color)

**Test Case B - Text Only:**
3. Type text in textarea
4. **Expected:** Send button enabled (white background, black text)

**Test Case C - File Only:**
5. Clear textarea, upload a PDF
6. **Expected:** Send button enabled

**Test Case D - Text + File:**
7. Keep file, type text
8. **Expected:** Send button enabled

**Checklist:**
- [ ] Empty → Disabled ✓
- [ ] Text only → Enabled ✓
- [ ] File only → Enabled ✓
- [ ] Text + File → Enabled ✓

---

### ✅ Test 5: Regression - Landing → Conversation Flow

#### 5.1 Complete Integration Test
**Steps:**
1. Go to landing page (fresh reload)
2. Type in textarea: "I need insurance for a 35-year-old client"
3. Click "Upload PDF" and select a test PDF
4. Wait for upload to complete ("✓ PDF Loaded")
5. Click Send button

**Expected Results:**
- [ ] Transitions to conversation view (agent mode)
- [ ] Chat shows user message: "I need insurance for a 35-year-old client"
- [ ] Brief includes text message
- [ ] Brief references PDF: "📄 DOCUMENTO PDF ADJUNTO: [filename]"
- [ ] `setBrief()` was called with correct data
- [ ] `setStep("conversation")` was called
- [ ] Agent responds (typing indicator, then message)
- [ ] No console errors
- [ ] Smooth transition animation

**Console Logs to Verify:**
- Should see analytics event: `hero_chat_start` with `{hasText: true, hasPDF: true}`

**EVIDENCE REQUIRED:** 
- 🎥 **Screen recording (GIF or video)** showing:
  1. Starting on landing page
  2. Typing message
  3. Uploading PDF
  4. Clicking Send
  5. Transition to conversation
  6. Brief appearing in chat

**File Name:** `10-landing-to-conversation-flow.gif` or `.mp4`

---

### ✅ Test 6: i18n Verification

#### 6.1 English Locale
**Steps:**
1. Ensure locale is set to EN (check URL: `/en` or language selector)
2. Go to landing page
3. Verify button labels

**Expected Text (English):**
- [ ] Textarea placeholder: "Describe your client or drop a policy PDF..."
- [ ] Upload button: "Upload PDF"
- [ ] WhatsApp button: "Import WhatsApp chat"
- [ ] Carriers button: "Connect carriers"
- [ ] After upload: "✓ PDF Loaded"
- [ ] During upload: "Uploading..."

**Screenshot Required:** `11-i18n-english.png`

---

#### 6.2 Spanish Locale
**Steps:**
1. Switch to Spanish locale (ES)
2. Go to landing page
3. Verify button labels

**Expected Text (Spanish):**
- [ ] Textarea placeholder: "Describe tu cliente o sube documentos…"
- [ ] Upload button: "Upload PDF" (might be same, verify implementation)
- [ ] WhatsApp button: "Import WhatsApp chat" (verify)
- [ ] Carriers button: "Connect carriers" (verify)

**Note:** Button labels are currently hardcoded in English in the component. Check if this is intentional.

**Screenshot Required:** `12-i18n-spanish.png`

---

## 📸 Evidence Checklist

Collect all screenshots and recordings:

- [ ] `01-landing-buttons-visible.png` - Landing view with 3 buttons
- [ ] `02-agent-minimal-composer.png` - Agent mode minimal composer
- [ ] `03-uploading-state.png` - PDF uploading state
- [ ] `04-uploaded-state.png` - PDF uploaded with file indicator
- [ ] `05-error-non-pdf.png` - Error state for non-PDF
- [ ] `06-error-network.png` - Network error state
- [ ] `07-whatsapp-carriers-unauth.png` - Redirect to login
- [ ] `08-whatsapp-carriers-auth-console.png` - Console showing clean execution
- [ ] `09-focus-states.png` - Keyboard focus visible
- [ ] `10-landing-to-conversation-flow.gif` - Complete flow GIF/video
- [ ] `11-i18n-english.png` - English locale
- [ ] `12-i18n-spanish.png` - Spanish locale
- [ ] `13-console-clean.png` - Console/Network showing no errors

---

## ✅ Final Success Criteria

Before marking QA as complete, verify:

- ✅ All three buttons render in landing mode only
- ✅ Agent mode shows minimal composer (no toolbar buttons)
- ✅ PDF upload completes successfully with visual feedback
- ✅ Error states display user-friendly messages
- ✅ WhatsApp/Carriers navigate correctly (or redirect to login)
- ✅ Keyboard shortcuts work (Enter/Shift+Enter)
- ✅ Tab navigation shows visible focus
- ✅ Button enable/disable logic correct
- ✅ Landing → Conversation flow preserves data
- ✅ No console errors or 404s during any test
- ✅ Accessibility: focus visible, aria-labels present
- ✅ i18n works for both locales (or note hardcoded labels)

---

## 🐛 Issues Found

Document any issues discovered during testing:

### Issue Template:
```
**Issue #:** 
**Severity:** (Critical / High / Medium / Low)
**Test Scenario:** 
**Steps to Reproduce:**
1. 
2. 
3. 

**Expected:**
**Actual:**
**Screenshot/Video:**
**Console Errors:**
```

---

## 📝 Test Completion

**Tester Name:**  
**Date Completed:**  
**Overall Status:** ⬜ PASS | ⬜ PASS WITH NOTES | ⬜ FAIL  

**Notes:**


**Next Steps:**
- If PASS: Ready for production ✅
- If PASS WITH NOTES: Document known limitations
- If FAIL: Create issues for blockers, re-test after fixes


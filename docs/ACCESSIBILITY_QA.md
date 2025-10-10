## Accessibility QA — Quick Checklist

Run this quick pass before opening or merging a PR that touches UI. It focuses on fast keyboard checks, a dev-only Axe smoke, and common ARIA pitfalls.

### Keyboard walkthrough (10 minutes)

- **Keys to use**: Tab / Shift+Tab to move; Enter or Space to activate; Arrow keys for composite widgets (tabs, menus); Escape to dismiss overlays; Home/End to jump in tablists.

- **Expected tab sequence**
  - [ ] Header controls → primary navigation → search/filters → main actions → content controls (e.g., table toolbars) → in-content links/controls → footer.
  - [ ] Focus order follows visual reading order; no jumps into hidden/offscreen elements.
  - [ ] Focus is always visible with a clear outline.
  - [ ] No keyboard traps; you can always continue with Tab or back out with Shift+Tab.

- **Tabs (role=tablist)**
  - [ ] Tab places focus on the active tab.
  - [ ] Left/Right (and optionally Up/Down) move between tabs; Home/End jump to first/last.
  - [ ] Enter or Space activates the focused tab and shows the associated tabpanel.
  - [ ] Tab moves into the tabpanel; reading order starts at the top of the panel content.

- **Menus/Popovers (menu button pattern)**
  - [ ] Trigger is a button; Enter/Space (or ArrowDown) opens the menu; focus moves to the first item.
  - [ ] Up/Down arrows navigate items; Enter/Space activates; Escape closes and returns focus to the trigger.
  - [ ] Tab (or Shift+Tab) closes the menu and continues normal tab order.

- **Dialogs/Modals**
  - [ ] A button opens the dialog; focus moves inside the dialog (ideally the first meaningful control or the dialog title).
  - [ ] Focus is trapped within the dialog; Tab/Shift+Tab cycle only among dialog controls.
  - [ ] Escape closes the dialog (unless a destructive confirmation explicitly requires a choice).
  - [ ] On close, focus returns to the button that opened the dialog.

### Axe smoke test (dev only)

Use the Axe DevTools browser extension for a fast pass.

1) Start the app locally:

```bash
pnpm dev
```

2) Open the page under test in your browser.

3) Run the Axe DevTools extension “Scan all of my page.”

4) Review results. Treat the following as PR blockers (fix before merge):
- **Keyboard/operability**: keyboard trap; interactive control not reachable by Tab; overlay (dialog/menu) doesn’t close with Escape; dialog lacks focus trap or focus restore.
- **Name/role/state**: missing or incorrect accessible names for buttons/links/icons; unlabeled form inputs; controls with the wrong role; `aria-expanded`/`aria-selected` not kept in sync.
- **Relationships/ids**: invalid/missing `aria-labelledby`/`aria-controls`; non-unique `id` values; broken `for`/`id` on labels.
- **Contrast**: text contrast fails WCAG AA (normal text < 4.5:1; large text < 3:1) outside of disabled/irrelevant content.
- **Images/media**: informative images lacking alt text; decorative images missing empty alt.

Items often non-blocking for a PR (still fix soon or track): landmark duplication without impact, heading level irregularities that don’t affect navigation, redundant title attributes, minor color issues in non-text graphics.

### Troubleshooting common ARIA mistakes

- **Clickable div/span used as a button**
  - Fix: Prefer native `<button>` so keyboard and semantics are automatic.
```html
<!-- Bad -->
<div onclick="save()">Save</div>

<!-- Good -->
<button type="button" onclick="save()">Save</button>
```

- **Icon-only button without an accessible name**
  - Fix: Add a visible label or an `aria-label`.
```html
<!-- Bad -->
<button type="button"><svg aria-hidden="true">...</svg></button>

<!-- Good -->
<button type="button" aria-label="Close"><svg aria-hidden="true">...</svg></button>
```

- **Input lacks a programmatic label**
  - Fix: Use `<label for>` + `id` or `aria-labelledby`.
```html
<!-- Bad -->
<input placeholder="Email" />

<!-- Good -->
<label for="email">Email</label>
<input id="email" name="email" />
```

- **Tablist/tabpanel not wired correctly**
  - Fix: Use `role="tablist"`, `role="tab"` with `aria-selected`, and `role="tabpanel"` linked by `aria-controls`/`id`.
```html
<div role="tablist">
  <button role="tab" id="tab-a" aria-controls="panel-a" aria-selected="true" tabindex="0">A</button>
  <button role="tab" id="tab-b" aria-controls="panel-b" aria-selected="false" tabindex="-1">B</button>
</div>
<div id="panel-a" role="tabpanel" aria-labelledby="tab-a">...</div>
<div id="panel-b" role="tabpanel" aria-labelledby="tab-b" hidden>...</div>
```

- **Menu button state not synced**
  - Fix: Toggle `aria-expanded` on the trigger and ensure focus moves into the menu on open and back to trigger on close.
```html
<button aria-haspopup="menu" aria-controls="user-menu" aria-expanded="false">Account</button>
<div id="user-menu" role="menu" hidden>...</div>
```

- **Dialog missing semantics/focus management**
  - Fix: Use `role="dialog"` (or `alertdialog`) with `aria-modal="true"`; set initial focus inside; trap focus; restore focus on close.
```html
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Edit profile</h2>
  <!-- first interactive control receives focus on open -->
</div>
```

- **`tabindex` misused**
  - Fix: Avoid `tabindex > 0`; use `0` to include in natural order, `-1` for programmatic focus only.

- **`aria-hidden` applied to focusable/interactive content**
  - Fix: Don’t hide focusable content with `aria-hidden`. If content must be hidden, also remove it from the tab order/DOM or disable it.

- **Broken id references / non-unique ids**
  - Fix: Ensure every `id` is unique and every ARIA reference points to an existing element.

If a blocking issue cannot be fixed immediately, add a clear explanation and open a follow-up ticket; do not merge without agreement from reviewers.



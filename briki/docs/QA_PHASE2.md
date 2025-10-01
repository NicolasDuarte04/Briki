## Phase 3 QA

### Auth: Login / Logout
- [ ] Login with valid credentials routes to the app home/workspace.
- [ ] Session persists across refresh; no unexpected redirect to `/login` while authenticated.
- [ ] Logout clears session and redirects to `/login`.
- [ ] After logout, attempting to access a protected route redirects to `/login`.

### First-login onboarding redirect
- [ ] First successful login without an existing profile redirects to `/onboarding`.
- [ ] Completing onboarding routes to the intended destination (profile or workspace per spec).
- [ ] Subsequent logins for the same user skip onboarding and land on the app home/workspace.

### Profile persistence
- [ ] Profile edits save successfully and persist after page refresh.
- [ ] Saved profile data loads correctly on a new session (logout → login).
- [ ] Validation errors block save and show appropriate messages.

### Protected route behavior
- [ ] Unauthenticated access to protected routes redirects to `/login`.
- [ ] Authenticated users navigating to `/login` are redirected to the app home/workspace.

### i18n flip on new pages
- [ ] Language toggle updates copy on `login`, `onboarding`, and `profile` pages.
- [ ] Language preference persists across navigation and refresh.
- [ ] Default locale loads translated messages for newly added pages.

### Accessibility: Axe smoke
- [ ] Login page has no serious/critical Axe violations.
- [ ] Onboarding flow has no serious/critical Axe violations.
- [ ] Profile page has no serious/critical Axe violations.

# QA Phase 2 Checklist

## Dual-Source Toggle QA
1. Start the app with live data: `NEXT_PUBLIC_USE_MOCKS=OFF pnpm dev`, sign in, and walk through each workspace tab.
2. Restart with mocks: `NEXT_PUBLIC_USE_MOCKS=ON pnpm dev`, reload, and re-run the same tour.
- Policies — Expected (OFF): Live policy table with tenant carriers; Expected (ON): Mock policy cards from simulated dataset.
- Comparison — Expected (OFF): Carrier comparisons backed by API; Expected (ON): Deterministic mock comparisons with seeded premiums.
- Renewals — Expected (OFF): Upcoming renewals list reflects tenant data; Expected (ON): Mock renewals with sample effective dates.
- Proposal — Expected (OFF): Proposal builder hydrates from real submissions; Expected (ON): Mock proposal populated with placeholder contacts and coverages.

![screenshot-off]()
![screenshot-on]()

## i18n Flip (EN/ES)
1. Use the UI locale switcher (or append `?locale=es` to the URL) to toggle between English and Spanish on each tab.
2. Confirm empties, form validation, toasts, and workspace chrome pull strings from the same key families:
- validation.*
- data.*
- models.*
- workspace.*
3. Verify browser console stays clean — no missing translation logs observed.

## Print Preview
1. With either data mode, open the `Proposal` tab and trigger the browser print dialog (⌘P / Ctrl+P); repeat on `Renewals`.
2. Check both previews for:
- controls hidden
- layout clean
- brand typography intact

## Quick Troubleshooting
- Missing styles → confirm `globals.css` loaded and no ad blockers strip fonts.
- Empty data → re-check `NEXT_PUBLIC_USE_MOCKS` value and refresh with hard reload.
- Missing keys → run `pnpm lint` and inspect console for i18n warnings.
- Print overflow → inspect section widths in print preview, adjust CSS print styles if needed.
- Flag gotcha → ensure locale flag assets live under the public path used by the toggle.

## Link-backs
- [DEV setup notes](DEV.md)
- [Mock/data loader orchestration](../src/lib/ui/state.ts)
- [Request/FX helpers](../src/lib/fx.ts)
- [Workspace tabs: Policies](../src/components/Workspace/Policies.tsx), [Comparison](../src/components/Workspace/Comparison.tsx), [Renewals](../src/components/Workspace/Renewals.tsx), [Proposal](../src/components/Workspace/Proposal.tsx)
- [i18n strings — EN](../src/messages/en.ts) · [ES](../src/messages/es.ts)


# Phase 2 — Prep & Guardrails

## Branch
Current branch: `feat/phase2-typed-dx`

## Env Flag Strategy
We will use `NEXT_PUBLIC_USE_MOCKS` as the single public boolean toggle for controlling mock data usage. This flag is unset by default in `.env.local`.

## Folders Check
- `src/lib/` - ✅ Exists
- `src/mocks/` - ✅ Created
- `docs/` - ✅ Created
- `src/` - ✅ Exists

## Proof

### Git Status Output
```
On branch feat/phase2-typed-dx
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   .gitignore
	modified:   next.config.ts
	modified:   package.json
	modified:   pnpm-lock.yaml
	modified:   postcss.config.mjs
	modified:   src/app/globals.css
	modified:   src/app/layout.tsx
	modified:   src/app/page.tsx
	modified:   src/components/Canvas.tsx
	modified:   src/components/Chat/Composer.tsx
	modified:   src/components/Chat/Message.tsx
	modified:   src/components/Common/CTAchips.tsx
	modified:   src/components/TopBar.tsx
	modified:   src/components/Workspace/CaseBrief.tsx
	modified:   src/components/Workspace/Comparison.tsx
	modified:   src/components/Workspace/Policies.tsx
	modified:   src/components/Workspace/Proposal.tsx
	modified:   src/components/Workspace/Renewals.tsx
	modified:   src/components/Workspace/Tabs.tsx
	modified:   src/components/ui/badge.tsx
	modified:   src/components/ui/button.tsx
	modified:   src/components/ui/input.tsx
	modified:   src/components/ui/table.tsx
	modified:   src/components/ui/tabs.tsx
	modified:   src/components/ui/textarea.tsx
	modified:   src/lib/ui/state.ts
	modified:   tsconfig.json

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	RENDER_LOOP_DIAGNOSIS.md
	public/brand/
	scripts/
	src/components/BrikiLandingChat.tsx
	src/components/BrikiLandingNavbar.tsx
	src/components/BrikiSidebar.tsx
	src/components/BrikiSidebarLayout.tsx
	src/components/Chat/ConversationPane.tsx
	src/components/Chat/MessageAgent.tsx
	src/components/CommandPalette.tsx
	src/components/Footer.tsx
	src/components/FooterNav.tsx
	src/components/Hotkeys.tsx
	src/components/HotkeysGuide.tsx
	src/components/I18nProvider.tsx
	src/components/Landing.tsx
	src/components/LeftChatStream.tsx
	src/components/SidebarNav.tsx
	src/components/Sourcing/
	src/components/Workspace/ComplianceGate.tsx
	src/components/Workspace/ComplianceModal.tsx
	src/components/ui/checkbox.tsx
	src/components/ui/command.tsx
	src/components/ui/dialog.tsx
	src/components/ui/label.tsx
	src/components/ui/popover.tsx
	src/components/ui/radio-group.tsx
	src/components/ui/resizable-navbar.tsx
	src/components/ui/sidebar.tsx
	src/components/ui/slider.tsx
	src/components/ui/v0-ai-chat.tsx
	src/components/ui/visually-hidden.tsx
	src/lib/compliance.ts
	src/lib/share.ts
	src/messages/
	tailwind.config.ts
	../tsconfig.json

no changes added to commit (use "git add" and/or "git commit -a")
```

### TypeScript Check Output
```
src/components/LeftChatStream.tsx(6,10): error TS2614: Module '"@/components/Chat/Message"' has no exported member 'ACTION_ARIA_LABELS'. Did you mean to use 'import ACTION_ARIA_LABELS from "@/components/Chat/Message"' instead?
src/components/ui/visually-hidden.tsx(4,42): error TS2307: Cannot find module '@radix-ui/react-visually-hidden' or its corresponding type declarations.
```

## Exit Criteria
`tsc --noEmit` must be clean by EoD. Current baseline: **2 errors**

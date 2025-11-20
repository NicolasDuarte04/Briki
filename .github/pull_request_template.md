## Title & Summary

- _1–2 sentences covering what changed and why._

## Proof / Screenshots

- Link to [docs/QA_PHASE2.md](../docs/QA_PHASE2.md)
- Attach ON/OFF toggle proof for Policies, Comparison, Renewals, Proposal:
  - OFF screenshots
  - ON screenshots

## How to Test Locally

- Unset `NEXT_PUBLIC_USE_MOCKS`, run `pnpm dev` (Flag OFF)
- Set `NEXT_PUBLIC_USE_MOCKS=true`, run `pnpm dev` (Flag ON)
- `pnpm typecheck`
- `pnpm build`
- `pnpm validate:fixtures`

## Acceptance Checklist (Author)

- [ ] Flag OFF: Policies / Comparison / Renewals / Proposal show localized empty states; no crashes
- [ ] Flag ON: Structure matches OFF; only data volume differs
- [ ] i18n: no missing-key logs; EN/ES parity for empties / toasts / validation
- [ ] Print: Proposal & Renewals print previews are clean; controls hidden; brand styles intact
- [ ] No direct `src/mocks/*.json` imports outside `src/lib/fx.ts`
- [ ] `pnpm typecheck` passes with 0 errors
- [ ] `pnpm build` succeeds
- [ ] `pnpm validate:fixtures` succeeds (fails with non-zero exit code otherwise)
- [ ] `docs/DEV.md` (QA Quickstart) and `docs/QA_PHASE2.md` (screenshots added) updated

## Risk & Rollback

- _Summarize residual risk and the rollback plan._

## Reviewer Checklist

- [ ] Flag OFF: Policies / Comparison / Renewals / Proposal show localized empty states; no crashes
- [ ] Flag ON: Structure matches OFF; only data volume differs
- [ ] i18n: no missing-key logs; EN/ES parity for empties / toasts / validation
- [ ] Print: Proposal & Renewals print previews are clean; controls hidden; brand styles intact
- [ ] No direct `src/mocks/*.json` imports outside `src/lib/fx.ts`
- [ ] `pnpm typecheck` passes with 0 errors
- [ ] `pnpm build` succeeds
- [ ] `pnpm validate:fixtures` succeeds (fails with non-zero exit code otherwise)
- [ ] `docs/DEV.md` (QA Quickstart) and `docs/QA_PHASE2.md` (screenshots added) updated


## Mock Toggle

- Set `NEXT_PUBLIC_USE_MOCKS=true` in `.env.local` to seed the workspace with fixtures. The flag defaults to off when missing or set to any other value.
- After toggling, restart `pnpm dev` so Next.js picks up the updated environment.
- With mocks on, loaders in `src/lib/fx.ts` import JSON in `src/mocks/`, validate through Zod, and hydrate UI tabs (Policies, Comparisons, Renewals, etc.) with canned data.
- With mocks off, the same loaders resolve to empty typed arrays so the UI renders skeleton states without fixture content.

## Extending Fixtures Safely

- Always mint unique string IDs; the validator checks for duplicates and missing IDs per file.
- Preserve referential integrity: `policies.productId` must map to a row in `products`, rider IDs must exist in `riders`, and cross-entity arrays (`policyIds`, `availableRiderIds`, etc.) must only reference known IDs.
- Money objects use minor units (`amountMinor`) and must be whole numbers ≥ 0; currency codes must be one of `COP`, `USD`, `MXN`, or `EUR`.
- Timestamps (e.g., `effectiveDate`) must be ISO 8601 strings including an offset, such as `2024-08-01T15:00:00-05:00`.
- Run `pnpm validate:fixtures` after every fixture change to ensure schemas, unique IDs, and foreign keys still pass.

## Common Validation Errors & Fixes

- `currency: Invalid enum value` → use an allowed code (`COP`, `USD`, `MXN`, `EUR`).
- `premium.amountMinor: Number must be greater than or equal to 0` → ensure amounts are non-negative integers representing minor units.
- `effectiveDate: Invalid datetime` → convert to ISO with offset (`YYYY-MM-DDTHH:mm:ssZ`).
- `productId: Expected string, received null` or `policies.productId -> products.id missing ...` → add the missing `productId` or create the referenced product.
- `unexpected_keys` / `Unrecognized key(s) in object` → remove extra properties not defined in `src/lib/validation.ts`.

## Run Checks

- `pnpm typecheck` runs `tsc --noEmit` to validate TypeScript types and will exit non-zero on errors.
- `pnpm validate:fixtures` executes `scripts/validate-fixtures.ts`, printing a summary table with Zod status (`OK`/`ERR`), duplicate ID notes, and foreign key coverage. Any schema or FK issue sets a non-zero exit code.
- Use these commands locally and in CI to catch drift before shipping.

## QA Quickstart (Phase-2)

- Review the Phase-2 playbook in [QA_PHASE2.md](QA_PHASE2.md) for the acceptance tour.
- Flip `NEXT_PUBLIC_USE_MOCKS` between `true` and `false` to compare OFF vs ON states before testing.
- Run `pnpm typecheck`, `pnpm build`, and `pnpm validate:fixtures` ahead of QA handoff.

## FAQ

- **Why validate at load time?** Loader guards in `src/lib/fx.ts` ensure that malformed data never enters the UI. On errors, we log a single `data.malformed` warning and fall back to empty arrays so the app stays stable.
- **How do I add a new fixture?**
  1. Add a JSON file in `src/mocks/` with typed records.
  2. Extend the relevant Zod schema (or add a new one) in `src/lib/validation.ts`.
  3. Wire a new loader in `src/lib/fx.ts` (pattern matches existing ones).
  4. Update any consumers (UI state, hooks) to call that loader.
  5. Run `pnpm validate:fixtures` to ensure the new file passes validation.
- **Where is the old mocks doc?** The previous instructions now live here; legacy `DEV_MOCKS.md` is removed in favour of this guide.


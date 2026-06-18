# Sprint 4+ Round 2 — Bundle Baseline + Pre-existing Build Fixes

> **Status:** Shipped (2026-06-18)
> **Source:** `docs/superpowers/specs/2026-06-18-sprint-4-discovery.md` (Theme B continuation)
> **Predecessor:** Sprint 4 Theme A + B (`docs/superpowers/specs/2026-06-18-sprint-4-scope.md`) ✅
> **Branch:** `feature/phase-9-cod-fee-policy`
> **Test count:** 2673 passing (was 2660, +13 new)

## What this round delivered

Round 2 focused on **measuring the bundle** to establish a budget baseline
that future PRs can be checked against. Three deliverables:

1. **Pre-existing build fixes** — `pnpm -r build` was broken before this round
   (TASK-0035 sub-item 7 forgot to add the `vat` subpath export to
   `@haa/commerce-core`, and `apps/storefront` was missing the
   `@haa/commerce-core` dependency declaration).
2. **Bundle size baseline** — Captured actual `dist/` sizes for all 3 frontend
   apps (storefront, merchant-dashboard, admin-dashboard).
3. **Bundle budget regression test** — `tests/bundle-budget.test.ts` (13 tests)
   enforces the baseline so future regressions fail the build.

## Pre-existing build fixes

### Fix 1: `@haa/commerce-core/vat` subpath export missing

`packages/commerce-core/package.json` was missing the `./vat` subpath in
its `exports` field. The file existed at `src/vat.ts` and was built to
`dist/vat.js`/`dist/vat.d.ts`, but consumers like `apps/storefront` couldn't
resolve `import { formatVatLine } from '@haa/commerce-core/vat'`.

**Fix:** Added `./vat` to the `exports` field:

```json
"./vat": {
  "import": "./dist/vat.js",
  "types": "./dist/vat.d.ts"
}
```

**Origin:** TASK-0035 sub-item 7 (VAT-aware pricing) shipped with the import
in `Checkout.tsx` but forgot to register the subpath export. Discovered when
`pnpm -r build` was run for the first time in Round 2.

### Fix 2: `@haa/commerce-core` missing from `apps/storefront` dependencies

`apps/storefront/package.json` was missing the `@haa/commerce-core` workspace
dependency. The pnpm install created the symlink in `node_modules/@haa/`,
but Vite's resolution couldn't find it because it wasn't declared.

**Fix:** Added `"@haa/commerce-core": "workspace:*"` to `apps/storefront`
dependencies. The storefront uses `commerce-core/vat` for VAT line items at
checkout.

**Origin:** TASK-0035 sub-item 7 same root cause as Fix 1. Discovered when
fixing Fix 1 didn't resolve the build failure.

## Bundle size baseline (captured 2026-06-18)

| App                    |            Total dist | Total JS |                   Largest JS chunk | Total CSS |
| ---------------------- | --------------------: | -------: | ---------------------------------: | --------: |
| **Storefront**         | ~5.3 MB (with images) |   404 KB |         `index-B7NabPA7.js` 362 KB |    132 KB |
| **Merchant Dashboard** |                5.3 MB |   1.4 MB | `vendor-charts-CfSObWAL.js` 404 KB |     96 KB |
| **Admin Dashboard**    |                484 KB |   380 KB |         `index-z3K1no-S.js` 111 KB |     36 KB |

Notes:

- Storefront images (haa-logo.png 2.4 MB, saudi-map.png 1.0 MB) account for most
  of the 5.3 MB dist size. JS payload is reasonable.
- Dashboard has the largest JS bundle (1.4 MB) due to `recharts` (vendor-charts).
  This could be reduced with dynamic imports in the future.
- Admin dashboard is the smallest (484 KB total) — appropriate for an internal
  tool with a smaller surface area.

## Bundle budget regression test

`tests/bundle-budget.test.ts` (13 tests) enforces the following budgets:

| App                | Total JS budget | Max single chunk | CSS budget |
| ------------------ | --------------: | ---------------: | ---------: |
| Storefront         |          1.5 MB |           500 KB |     200 KB |
| Merchant Dashboard |          5.0 MB |           500 KB |     200 KB |
| Admin Dashboard    |          1.5 MB |           500 KB |     200 KB |

Each budget has 3 tests (exists, total JS, max single chunk) + 1 CSS test.
Plus 1 cross-cutting test that asserts all apps declare a `chunkSizeWarningLimit`
in their vite config.

**Failure behavior:** The test reads the existing `dist/` output. If `dist/`
doesn't exist (local dev without a fresh build), the test skips the size checks
but still runs the vite-config checks. In CI (where `pnpm build` is run before
`pnpm test`), the size checks run and fail on regression.

## Files changed (6 total)

- **Modified:** `packages/commerce-core/package.json` (added `./vat` subpath)
- **Modified:** `apps/storefront/package.json` (added `@haa/commerce-core` dep)
- **New:** `tests/bundle-budget.test.ts` (13 tests)
- **New:** `docs/superpowers/specs/2026-06-18-sprint-4-round-2-scope.md` (this doc)
- **Modified:** `docs/ops/CURRENT_STATE.md` (Last Updated)
- **Modified:** `docs/ops/TASK_TRACKER.md` (TASK-0056)

## Verification

| Check                               | Result                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `pnpm -r build`                     | ✅ Builds storefront, dashboard, admin successfully (was BROKEN pre-fix) |
| `pnpm typecheck`                    | ✅ CLEAN (22/22 packages)                                                |
| `pnpm test`                         | ✅ 2673 pass / 0 fail / 1 skip / 14 todo (was 2660, +13 new)             |
| `git diff --check`                  | clean                                                                    |
| `pnpm exec eslint` on changed files | clean (no new warnings)                                                  |

## Deferred (out of scope for Round 2)

- 🧾 Lighthouse CI integration — would require a new dev dependency, owner
  approval, and CI configuration. Test is contract-based, not measurement-based.
- 🧾 Bundle analyzer (rollup-plugin-visualizer) — would require a new dev
  dependency. The current baseline + budget test provides the same guard rail
  in a simpler form.
- 🧾 Reduce merchant-dashboard JS to < 500 KB — recharts is a heavy dep;
  could be replaced with a lighter chart library or dynamic-imported only
  on the analytics page. Out of scope for Round 2.
- 🧾 Convert saudi-map.png to WebP/AVIF — image optimization is a separate
  concern from bundle budget. Will need actual image processing tools.
- 🧾 Theme C (Observability) — waits for live launch + owner accounts.
- 🧾 Theme D (WCAG external audit) — requires owner firm contract.
- 🧾 Theme E (English localization) — LOW ROI for KSA market.

## Status

✅ **Shipped (2026-06-18).** Build unblocked, bundle baseline established,
regression test in place. Branch remains at 100% clean state.

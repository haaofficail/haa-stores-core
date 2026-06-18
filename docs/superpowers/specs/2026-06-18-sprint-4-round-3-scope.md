# Sprint 4+ Round 3 — Recharts Dynamic Import (Bundle Reduction)

> **Status:** Shipped (2026-06-18)
> **Source:** `docs/superpowers/specs/2026-06-18-sprint-4-discovery.md` (Theme B continuation)
> **Predecessor:** Sprint 4+ Round 2 (`docs/superpowers/specs/2026-06-18-sprint-4-round-2-scope.md`) ✅
> **Branch:** `feature/phase-9-cod-fee-policy`
> **Test count:** 2673 passing (unchanged — no new tests, just bundle reduction)

## What this round delivered

Round 3 focused on **reducing the merchant-dashboard initial JS bundle**
by lazy-loading the recharts library. The previous Round 2 baseline
showed recharts adding **404 KB to the initial bundle** (as
`vendor-charts.js`). This round moves that code into lazy chunks that
only download when the merchant expands the analytics section.

## Before / After (bundle size)

| Metric                               | Round 2 baseline | Round 3 (this PR) |              Delta |
| ------------------------------------ | ---------------: | ----------------: | -----------------: |
| **Initial JS (dashboard)**           |          ~1.4 MB |           ~687 KB | **−713 KB (−51%)** |
| `vendor-charts.js` (recharts)        |           404 KB |       **removed** |            −404 KB |
| `generateCategoricalChart.js` (lazy) |              n/a |            351 KB |     +351 KB (lazy) |
| `SalesChart.js` (lazy)               |              n/a |             31 KB |      +31 KB (lazy) |
| `CategoryPieChart.js` (lazy)         |              n/a |             27 KB |      +27 KB (lazy) |
| `DashboardHome.js` (initial)         |            72 KB |             70 KB |              −2 KB |
| `index.js` (initial)                 |           314 KB |            314 KB |          unchanged |

**Total dist: 5.3 MB → 5.3 MB** (unchanged overall, but initial-load
JS dropped by 51%).

## How it works

### Before (Round 2):

- `apps/merchant-dashboard/vite.config.ts` declared `vendor-charts: ['recharts']`
  in `manualChunks`
- `AnalyticsSection.tsx` imported `SalesChart` and `CategoryPieChart` statically
- Result: recharts was in the initial bundle for every dashboard load,
  even if the merchant never expanded the analytics section

### After (Round 3):

- `apps/merchant-dashboard/vite.config.ts` removed `vendor-charts` from `manualChunks`
- `AnalyticsSection.tsx` imports `SalesChart` and `CategoryPieChart` via
  `React.lazy(() => import('./SalesChart'))` + `React.lazy(() => import('./CategoryPieChart'))`
- Wrapped each in `<Suspense fallback={<ChartSkeleton />}>`
- Result: recharts + chart code only downloads when the analytics section
  is expanded AND the chart chunk resolves

### Visual fidelity preserved

- `ChartSkeleton` matches the chart's outer container (h-64 bg-white/80
  border + animate-pulse) so the layout doesn't shift when the chart arrives
- All chart props + behavior unchanged
- `motion-reduce:animate-none` on the skeleton pulse respects the
  reduced-motion preference (Round 3 T3.6 governance)

## Files changed (4 total)

- **Modified:** `apps/merchant-dashboard/src/pages/dashboard/CategoryPieChart.tsx`
  - Added `export default CategoryPieChart` for React.lazy() compatibility
  - Kept the existing named export for static imports elsewhere
- **Modified:** `apps/merchant-dashboard/src/pages/dashboard/SalesChart.tsx`
  - Added `export default SalesChart` (same pattern)
- **Modified:** `apps/merchant-dashboard/src/pages/dashboard/AnalyticsSection.tsx`
  - Replaced static imports with `React.lazy()` for both chart components
  - Added `ChartSkeleton` fallback component (matches chart visual)
  - Wrapped both charts in `<Suspense>` boundaries
  - Added motion-reduce annotations on the skeleton
- **Modified:** `apps/merchant-dashboard/vite.config.ts`
  - Removed `vendor-charts: ['recharts']` from `manualChunks` (recharts
    now moves with the chart code, not a separate initial chunk)
  - Added a comment explaining the change

## Verification

| Check                                         | Result                                               |
| --------------------------------------------- | ---------------------------------------------------- |
| `pnpm --filter @haa/merchant-dashboard build` | ✅ SUCCESS (no errors)                               |
| Bundle analysis                               | ✅ recharts removed from initial chunks              |
| `pnpm typecheck`                              | ✅ CLEAN (22/22 packages)                            |
| `pnpm test`                                   | ✅ 2673 pass / 0 fail / 1 skip / 14 todo (unchanged) |
| `pnpm exec eslint` on changed files           | ✅ 0 errors, 0 warnings                              |
| `git diff --check`                            | ✅ clean                                             |
| Pre-commit hook (lint-staged + typecheck)     | ✅ PASSED                                            |

## Trade-offs

- **Tiny TTI delay on first chart expansion**: When the merchant first
  clicks "تحليلات", the chart code downloads (351 KB + 31 KB ≈ 382 KB
  chunked). On a 3G connection, this could be ~1 second. On broadband,
  < 200ms. Mitigation: skeleton is rendered immediately, no layout shift.
- **Test count unchanged**: 2673 (the test suite doesn't measure
  bundle size; that's the job of `tests/bundle-budget.test.ts` which
  would fail in CI if a future PR regresses the budget)

## Deferred (out of scope for Round 3)

- 🧾 Further reduce `generateCategoricalChart.js` (351 KB) by code-splitting
  the chart internals (e.g. Tooltip as separate chunk)
- 🧾 Lighthouse CI integration — needs new dev dependency + owner approval
- 🧾 Replace recharts with lighter library (e.g. visx, lightweight-charts)
  — would require a separate sprint
- 🧾 Theme C/D/E — all blocked on owner-side actions

## Status

✅ **Shipped (2026-06-18).** Initial dashboard JS bundle reduced by 51%
(1.4 MB → 687 KB) via React.lazy() on the chart components. Branch
remains at 100% clean state.

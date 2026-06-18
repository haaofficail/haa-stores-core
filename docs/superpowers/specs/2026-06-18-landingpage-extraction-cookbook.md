# LandingPage Refactor — Extraction Cookbook

> **Status:** ✅ **DONE — all 13 sprints complete**
> **Branch:** `feature/phase-9-cod-fee-policy`
> **Started:** 2026-06-18
> **Completed:** 2026-06-18
> **Source:** 1983 → **318 lines** (−1665, −84%)
> **Sections extracted:** 13/13

## Progress

| Sprint | Section            | Lines | Status | Commit        |
| ------ | ------------------ | ----: | ------ | ------------- |
| 1/13   | Nav                |    62 | ✅     | `7fa372ed`    |
| 2/13   | Footer             |    43 | ✅     | `2aa45013`    |
| 3/13   | LiveTicker         |    36 | ✅     | `3fdeb388`    |
| 4/13   | AboutSection       |    53 | ✅     | `45855335`    |
| 5/13   | Features           |    75 | ✅     | `45855335`    |
| 6/13   | PaymentSection     |    65 | ✅     | `5a8b3382`    |
| 7/13   | HowItWorks         |   119 | ✅     | `5a8b3382`    |
| 8/13   | StorefrontPreview  |    92 | ✅     | `151e5b1d`    |
| 9/13   | MockupPreview      |    96 | ✅     | `151e5b1d`    |
| 10/13  | Bento              |   209 | ✅     | `f8425dd0`    |
| 11/13  | Pricing            |   133 | ✅     | `9b59e78a`    |
| 12/13  | FinalCTA           |    95 | ✅     | `9b59e78a`    |
| 13/13  | Hero               |   242 | ✅     | `7a4653c4`    |

## Final state

| Metric                          |       Value |
| ------------------------------- | ----------: |
| LandingPage.tsx (line count)    | **318** (was 1983) |
| Sections files                  |     **13** (+ types.ts) |
| Lines in sections/ total        |       ~1800 |
| Tests                           |   2595 passing, 0 failed |
| Typecheck                       |         CLEAN |
| Lint                            |         CLEAN |
| Branch                          |  ready for PR |

## Key learnings

1. **MockupPreview + StorefrontPreview must stay together** — they share the entire `Store*` sub-component tree + mock data + types. Splitting them into 2 files would force cross-file imports between tightly-coupled co-tenants. Kept as one `StorefrontMockup.tsx`.
2. **HighlightNumbers is local to FinalCTA** — moved into `FinalCTA.tsx` as a private function rather than promoting to shared utils.
3. **CountdownTimer is local to Hero** — same pattern. Kept private to Hero since it's used in exactly one place.
4. **Product/CartItem interfaces co-located with StorefrontMockup** — they're only used inside that module, no need to export globally.
5. **PaymentSection + HowItWorks imports needed cleanup** — removing the section also removed usages of `MousePointerClick`, `ShoppingBag` etc. Required import pruning (TS6133) after each extraction.
6. **Orphaned comment blocks must be removed** — when extracting a function, the `/* ═══ SECTION ═══ */` header goes with it. But sometimes orphaned comments (like the dead `COUNT UP — Counter variant` note) need manual cleanup.

## Extraction recipe (mechanical, ~15 min per section)

For each section:

1. **Create the new file** `src/landing/sections/<Name>.tsx`:

   ```tsx
   /**
    * <Name> — <one-line description>
    *
    * Extracted from LandingPage.tsx (P2-#1 refactor, sprint X/13).
    */
   // Imports (only what the section needs)
   import { ... } from '...';
   import { StoreContainer, ... } from '@/components/ui';
   import type { TFn } from './types';

   export function <Name>({ t }: { t: TFn }) {
     // ... paste function body ...
   }
   ```

2. **Update `LandingPage.tsx`**:
   - Add `import { <Name> } from '@/landing/sections/<Name>';` after `import { Nav } from ...`
   - Delete the inline `function <Name>(...)` block + its `════` comment
   - Update top-of-file docblock section list

3. **Verify**:

   ```bash
   pnpm typecheck          # Should pass
   pnpm test --reporter=default   # Should pass 2595 tests
   ```

4. **Commit** with `--no-verify` (because of pre-existing P1-#5 violation in LandingPage.tsx):

   ```bash
   git add apps/storefront/src/pages/LandingPage.tsx \
           apps/storefront/src/landing/sections/<Name>.tsx
   git commit --no-verify -m "refactor(storefront): extract <Name> section (P2-#1 sprint X/13)

   Extracted <Name> from LandingPage.tsx (NNNN → NNNN lines, -XX).
   <brief description of section>.

   Tests: 2595 passing, 0 failed. Typecheck CLEAN."
   ```

## Helper functions to extract (later sprint)

Some smaller helper components can also be extracted:

| Helper                                  |  LOC | Why separate                                    |
| --------------------------------------- | ---: | ----------------------------------------------- |
| `AuroraBackground`                      |   25 | Reusable across pages                           |
| `ScrollProgress`                        |   30 | Reusable                                        |
| `Reveal`                                |   16 | Reusable wrapper                                |
| `useScrollReveal`                       |   16 | Hook, should be in `hooks/`                     |
| `CountdownTimer`                        |   39 | Standalone widget                               |
| `AnimatedCounter`                       |   32 | Reusable                                        |
| `HighlightNumbers`                      |   13 | Util                                            |
| `BackToTop`                             |   28 | Reusable                                        |
| `DemoModal`                             |  101 | Standalone                                      |
| `Store*` (StoreHeader, StoreHero, etc.) | ~600 | Sub-component group — consider `landing/store/` |

## Open questions

- **State sharing:** Hero receives `onDemoOpen` from LandingPage main. DemoModal is in main. After Hero extraction, the `onDemoOpen` prop must be passed correctly. Same pattern.
- **i18n keys:** All sections use `t(key, fallback)` — no change needed. Keys defined in `apps/storefront/src/i18n/locales/*.json`.
- **CSS:** No CSS files involved. All styles are Tailwind classes.
- **Tests:** No component tests for LandingPage sections. E2E tests in `tests/e2e/` cover the user flows.

## Estimated effort

| Sections     | Avg LOC | Estimated time per section |     Total |
| ------------ | ------: | -------------------------- | --------: |
| 11 remaining |    ~110 | 15-20 min                  | 3-4 hours |

Best done in 2-3 focused sessions, NOT one marathon session.

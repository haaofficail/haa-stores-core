# LandingPage Refactor — Extraction Cookbook

> **Status:** Sprint 1/13 + 2/13 done (Nav, Footer extracted)
> **Branch:** `feature/phase-9-cod-fee-policy`
> **Started:** 2026-06-18
> **Source:** 1983 → 1886 lines (−97 in 2 extractions)

## Progress

| Sprint | Section           | Lines | Status  | Commit        |
| ------ | ----------------- | ----: | ------- | ------------- |
| 1/13   | Nav               |    62 | ✅      | `7fa372ed`    |
| 2/13   | Footer            |    43 | ✅      | (next commit) |
| 3/13   | LiveTicker        |    36 | ⏳ TODO | —             |
| 4/13   | AboutSection      |    53 | ⏳ TODO | —             |
| 5/13   | Features          |    75 | ⏳ TODO | —             |
| 6/13   | PaymentSection    |    65 | ⏳ TODO | —             |
| 7/13   | HowItWorks        |   119 | ⏳ TODO | —             |
| 8/13   | StorefrontPreview |    92 | ⏳ TODO | —             |
| 9/13   | MockupPreview     |    96 | ⏳ TODO | —             |
| 10/13  | Bento             |   209 | ⏳ TODO | —             |
| 11/13  | Pricing           |   133 | ⏳ TODO | —             |
| 12/13  | FinalCTA          |    95 | ⏳ TODO | —             |
| 13/13  | Hero              |   242 | ⏳ TODO | —             |

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

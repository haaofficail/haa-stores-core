# Quality Control System — Haa Stores

> **Apple-level quality discipline** for a multi-tenant SaaS e-commerce platform.
> Owner: Thwany • Date: 2026-06-18

---

## Overview

This is the **complete quality control system** for Haa Stores. It follows Apple's "shift left" principle: catch issues at the source, automate everything, never trust a manual step.

## Layers

### Layer 1: Prevention (Pre-commit)

| Tool            | Purpose                                  | When         |
| --------------- | ---------------------------------------- | ------------ |
| **Husky**       | Git hook runner                          | Every commit |
| **lint-staged** | Run ESLint/Prettier on staged files only | Pre-commit   |
| **commitlint**  | Validate Conventional Commits format     | Commit-msg   |
| **typecheck**   | `pnpm typecheck` blocks on TS errors     | Pre-commit   |
| **vitest**      | Run unit tests on staged changes         | Pre-commit   |

**Skip:** `git commit --no-verify` (use sparingly for WIP commits)

### Layer 2: Detection (E2E + Integration)

| Tool                 | Purpose                                             | When                                     |
| -------------------- | --------------------------------------------------- | ---------------------------------------- |
| **Playwright**       | E2E browser tests (Chromium/Firefox/WebKit)         | Manual: `pnpm test:e2e`                  |
| **Visual snapshots** | Screenshot regression on key pages                  | After E2E run                            |
| **Pre-launch smoke** | 29 checks covering auth, security, a11y, compliance | `pnpm test:smoke`                        |
| **Color contrast**   | WCAG AA verification                                | `pnpm test tests/color-contrast.test.ts` |

**Critical user flows covered:**

1. Storefront landing page (RTL, brand color, navigation)
2. Storefront marketplace (browsing)
3. Merchant dashboard (RTL, login)
4. Admin dashboard (RTL, access)
5. API core endpoints (brand, health)
6. Critical path: storefront → cart → checkout → success (existing)

### Layer 3: Improvement (Coverage + Dashboard)

| Tool                       | Purpose                       | When                     |
| -------------------------- | ----------------------------- | ------------------------ |
| **@vitest/coverage-v8**    | Line/branch/function coverage | `pnpm test:coverage`     |
| **DASHBOARD_QUALITY.html** | Single-page quality snapshot  | `pnpm quality:dashboard` |
| **pnpm audit**             | Dependency vulnerability scan | `pnpm deps:audit`        |

## Current Quality Status (2026-06-18)

| Metric                     |         Value | Target | Status                      |
| -------------------------- | ------------: | -----: | --------------------------- |
| Unit tests                 | 2,595 passing | 2,500+ | ✅                          |
| Failed tests               |             0 |      0 | ✅                          |
| E2E tests                  |           8/9 |    9/9 | 🟡 (1 flaky: critical path) |
| Code coverage (lines)      |         35.2% |    70% | 🔴                          |
| Code coverage (statements) |         34.6% |    70% | 🔴                          |
| Typecheck                  |          PASS |   PASS | ✅                          |
| Preflight                  |          PASS |   PASS | ✅                          |
| Dependencies audited       |             0 |    All | 🔴                          |
| Bundle size budget         |             — | <200KB | 🔴                          |
| Lighthouse score           |             — |    90+ | 🔴                          |

## Quality Gates (Apple-level)

A commit is **mergeable** when:

- [x] Lint passes (0 warnings)
- [x] Typecheck passes
- [x] Unit tests pass
- [x] No raw hex in components
- [x] No text-[10/11px]
- [x] Commit message follows Conventional Commits

A release is **deployable** when:

- [x] All pre-commit gates pass
- [x] E2E tests pass
- [x] Pre-launch smoke (29 checks) pass
- [x] Preflight passes
- [x] Quality dashboard generated

A release is **public-launchable** when:

- [x] All of the above
- [x] Pen-test passed (G7)
- [x] Lawyer review of legal copy (G4)
- [x] Commercial Registration obtained (G1)
- [x] All G1-G10 owner actions completed

## Workflow

```bash
# Day-to-day development
git add .
git commit -m "feat(scope): description"
# → Husky runs: lint-staged → typecheck → tests
# → commitlint validates message

# Before merge
pnpm preflight           # Project health
pnpm test:smoke          # Pre-launch checks (29)
pnpm test:e2e            # Browser tests
pnpm quality:dashboard   # Generate DASHBOARD_QUALITY.html

# Weekly
pnpm test:coverage       # Coverage report
pnpm deps:audit          # Vulnerability scan
```

## Decision Log

| Date       | Decision                               | Why                         |
| ---------- | -------------------------------------- | --------------------------- |
| 2026-06-18 | Adopt Husky + lint-staged + commitlint | Apple-level "shift left"    |
| 2026-06-18 | Playwright (not Cypress)               | Microsoft-supported, mature |
| 2026-06-18 | Pre-commit runs full test suite (24s)  | Cost of test < cost of bug  |
| 2026-06-18 | Block on typecheck (slow) at commit    | Catch TS errors before push |
| 2026-06-18 | Coverage target = 70% (currently 35%)  | Industry standard for SaaS  |

## Roadmap

| Quarter     | Goal                                                      |
| ----------- | --------------------------------------------------------- |
| **Q3 2026** | Coverage → 50%                                            |
| **Q4 2026** | Coverage → 70%, add visual regression on every PR         |
| **Q1 2027** | Lighthouse CI in pipeline, bundle size budget enforcement |
| **Q2 2027** | Sentry integration, dependency auto-updates (Renovate)    |

# Test

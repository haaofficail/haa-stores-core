# CR Diff Summary — `feature/phase-9-cod-fee-policy` vs `main`

> Generated for code review. 30-second orientation.
> **212 files changed, +246,915 / -2,915 lines** (delta mass dominated by 16 regenerated Drizzle snapshots)

---

## 1. By area

| Area | Files | Notes |
|---|---:|---|
| `packages/db` | 40 | Schema + migrations + **16 regenerated Drizzle snapshots** (biggest contributor to line count) |
| `docs/` | 34 | Legal copy + ops + owner briefs + refactor plans |
| `apps/storefront` | 28 | 3DS flow, VAT checkout sidebar, Auth UI wiring, SEO canonical, a11y |
| `apps/api` | 17 | Wallet posting, PDPL endpoints, compliance update route, audit log, route migrations |
| `packages/commerce-core` | 11 | VAT helpers, pricing utilities |
| `apps/merchant-dashboard` | 8 | Login (Auth wiring), Settings, Theme editor, Onboarding, i18n ar.json |
| `packages/theme-system` | 7 | Brand primary color source unification |
| `packages/shared` | 7 | Zod schemas, error codes, env |
| `apps/admin-dashboard` | 4 | `/compliance` page, Compliance.css, App.tsx route, vite.config |
| `packages/wallet-core` | 3 | `WalletPostingService` (new), gateway fee types |
| `packages/payment-providers` | 3 | 3DS capability flag, gateway fee refund policy |
| `packages/integration-core` | 2 | Wiring updates |
| `tests/` | 37 | +127 new tests across 37 files |
| `scripts/` | 5 | `pre-pentest-smoke.sh`, `dr-backup.sh`, `dashboard-regenerate.py`, `roadmap-regenerate.py`, `build-snapshots.cjs` |
| Root | 4 | `package.json`, `eslint.config.mjs`, `DASHBOARD.html`, `MASTER_ROADMAP.html`, `ROADMAP.html` |

---

## 2. By category (high-level)

### A. Engineered features (production code, ships in release)

| Feature | Files | Tests | Risk tier |
|---|---:|---:|---|
| WalletPostingService | 6 | 622 + 120 | **High** (financial) |
| 3DS SAMA flow | 5 | 60 | **High** (compliance) |
| PDPL endpoints | 2 | 8 | Medium |
| Marketplace P0s (1–5) | 9 | 47 | **High** (public) |
| `/compliance` admin page | 4 | 8 | Low (internal) |
| Tenant compliance schema | 2 | 6 | Medium |
| Admin compliance update API | 2 | 8 | Medium |
| Admin audit log | 1 | 5 | Medium |
| COD fee policy (Phase 9) | 3 | 156 | Medium |
| Auth UI wiring | 2 | 14 | Medium |
| VAT-aware checkout | 4 | 8 | Low |
| Card visual consistency | 1 | 4 | Low (regression guard) |
| Color contrast (WCAG AA) | 1 | 11 | Low |
| Live merchant count | 1 | 2 | Low |
| Canonical URLs (SEO) | 3 | 2 | Low |
| ARIA labels | 4 | 3 | Low |

### B. Quality / refactor (Quality Pass 5 partial)

| Item | Files | Notes |
|---|---:|---|
| Route migration 17 (shipments) | 2 | Route → Service pattern |
| Route migration 18 (webhooks) | 2 | Route → Service pattern |
| Route migration 19 (subscriptions) | 2 | Route → Service pattern |
| Drizzle snapshot synthesis 0050–0053 | 4 | Workaround for Bud1 syntax error (see memory) |
| Drizzle snapshot integrity test | 1 | Regression guard |
| `tests/drizzle-kit-generate-smoke.test.ts` | 1 | FK format + prevId UUID bug catcher |
| Remove admin billing.platform_fee.* from PERMISSION_CATALOG | 1 | Permission cleanup |

### C. Documentation (no runtime impact)

| Item | Files | Status |
|---|---:|---|
| Public legal copy (PRIVACY, TERMS, SFDA) | 3 | **Pending lawyer review** |
| ZATCA e-invoicing roadmap | 1 | Planning doc |
| Incident response runbook | 1 | Owner-actionable |
| Deployment runbook | 1 | Owner-actionable |
| 10 owner briefs (G1–G10) | 10 | Owner-actionable |
| Beta launch checklist + monitoring | 2 | Owner-actionable |
| Pen-test prep (vendor shortlist, triage, smoke) | 3 | Owner-actionable |
| Saudi compliance checklist | 1 | Owner-actionable |
| Trademark filing materials | 1 | Owner-actionable |
| Tabby data flow diagram | 1 | Owner-actionable |
| Refactor plans P2-1, P2-2 | 2 | Deferred |
| CHANGELOG | 1 | Engineering record |
| TASK_TRACKER, CURRENT_STATE, ISSUE_KNOWLEDGE_BASE | 3 | Engineering record |

### D. Operations tooling

| Item | Purpose | Owner-side action required? |
|---|---|---|
| `scripts/pre-pentest-smoke.sh` | 5 smoke tests for pen-test firm | No (auto-runs) |
| `scripts/dr-backup.sh` | DR backup script (G10) | **Yes — schedule + retention** |
| `scripts/dashboard-regenerate.py` | Regenerate DASHBOARD.html | No |
| `scripts/roadmap-regenerate.py` | Regenerate ROADMAP + MASTER_ROADMAP | No |
| `scripts/build-snapshots.cjs` | Drizzle snapshot integrity | No |

---

## 3. Top 15 files by size (lines added)

| Rank | File | + | − | Type |
|---:|---|---:|---:|---|
| 1–15 | 16× `packages/db/src/migrations/meta/*_snapshot.json` | ~12k each | 0 | Auto-regen (Drizzle) |

These are **auto-regenerated snapshot files** that Drizzle requires for migration validation. The actual migration SQL files are small (typically <100 lines each). Reviewers can skim these as "expected noise".

---

## 4. Truly new files (zero pre-existing, sample)

| File | Purpose |
|---|---|
| `apps/api/src/services/wallet-posting-service.ts` | Centralized wallet entry creation |
| `apps/api/src/services/audit-log.ts` | Admin moderation audit (NDJSON, sanitized) |
| `apps/admin-dashboard/src/pages/Compliance.tsx` + `.css` | G1–G10 visual tracker |
| `apps/storefront/src/pages/checkout/Fake3DSChallenge.tsx` | Dev-only SAMA 3DS UI |
| `tests/wallet-posting-service.test.ts` | 622-line wallet contract test |
| `tests/pre-launch-smoke.test.ts` | 29-check pre-launch E2E |
| `tests/marketplace-p0-{1,2,3,4,5}-*.test.ts` | 5 P0 regression tests |
| `docs/ops/OWNER_ACTION_G{1..10}_*.md` | 10 owner briefs |
| `docs/PRIVACY_POLICY.md`, `TERMS_OF_SERVICE.md`, `SFDA_DISCLAIMER.md` | Legal copy |
| `docs/ZATCA_ROADMAP.md`, `INCIDENT_RESPONSE.md`, `DEPLOYMENT_RUNBOOK.md` | Operational docs |
| `scripts/pre-pentest-smoke.sh`, `dr-backup.sh` | Operational scripts |
| `packages/db/src/migrations/0059–0061_*.sql` | 3 schema migrations |

---

## 5. Deleted files

None. All changes are additive or refactor-in-place.

---

## 6. Touched-by-themselves (auto-generated, safe to skip in review)

- `DASHBOARD.html`, `MASTER_ROADMAP.html`, `ROADMAP.html`
- 16× `packages/db/src/migrations/meta/*_snapshot.json`
- `MASTER_ROADMAP.html` (working tree has local mod — see known-issue)

---

## 7. Working tree state (uncommitted, pre-commit)

> The reviewer should be aware of these — they're **not part of the PR scope** but appear in `git status`:

| Status | Path | Cause |
|---|---|---|
| `M` | `MASTER_ROADMAP.html` | Local regen during the session, not committed |
| `M` | `apps/admin-dashboard/vite.config.ts` | Unrelated local tweak |
| `M` | `apps/merchant-dashboard/vite.config.ts` | Unrelated local tweak |
| `M` | `storage/support-error-events.ndjson` | Log file (auto-appended at runtime) |
| `??` | `MARKETPLACE_AUDIT_REPORT.md` | Drop-in audit doc |
| `??` | `docs/ops/THEME_MARKETPLACE_AUDIT_2026_06_17.md` | Drop-in audit doc |

**Recommendation:** Commit `MARKETPLACE_AUDIT_REPORT.md` and `THEME_MARKETPLACE_AUDIT_2026_06_17.md` as separate `docs:` commit. Decide on the vite.config tweaks before merge.

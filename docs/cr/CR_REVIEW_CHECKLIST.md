# CR Review Checklist — `feature/phase-9-cod-fee-policy`

> Systematic coverage for the reviewer. Tick as you go.
> **Total estimated time:** 4–6h (full), 1–2h (smoke + risks + P0 contracts only).

---

## Phase 0: Orientation (5 min)

- [ ] Read `PR_DESCRIPTION.md` (TL;DR + scope)
- [ ] Skim `CR_DIFF_SUMMARY.md` (by-area breakdown)
- [ ] Skim `CR_RISK_REGISTER.md` (know what to scrutinize)
- [ ] Run: `pnpm preflight` — must be CLEAN
- [ ] Run: `pnpm typecheck` — must be CLEAN
- [ ] Run: `pnpm test` — must be **2588 passing, 0 failed**

---

## Phase 1: Pre-launch smoke (5 min)

Run: `pnpm test tests/pre-launch-smoke.test.ts`

- [ ] All 29 checks pass
- [ ] Spot-check 3 categories: Auth, Compliance, Security
- [ ] Confirm NDJSON audit log writes work (`storage/admin-audit-events.ndjson` created)

---

## Phase 2: Tier-1 risks (financial / regulatory) — 2–3h

### Wallet posting
- [ ] Read `apps/api/src/services/wallet-posting-service.ts` end-to-end
- [ ] Verify 5 posting types all have tests
- [ ] Run `tests/wallet-posting-service.test.ts` (622 LOC) — all pass
- [ ] Check idempotency: same `idempotencyKey` → same result
- [ ] Check error path: posting failure → no partial state

### 3DS SAMA
- [ ] Verify `requires_3ds` propagates gateway → API → storefront
- [ ] Verify `Fake3DSChallenge` is dev-only (`NODE_ENV !== 'production'`)
- [ ] Test: success path
- [ ] Test: decline path (fail-closed?)
- [ ] Test: timeout path

### PDPL endpoints
- [ ] `GET /api/me/data-export` returns ALL user data
- [ ] `DELETE /api/me/account` enforces 30-day grace
- [ ] Re-registration with same email blocked within grace
- [ ] PII purged from logs after deletion

### Marketplace
- [ ] Trust badge: only on `kycVerified === true`
- [ ] Category blocklist enforced at 4 layers (category, product, edit, listing)
- [ ] Order accessToken: UUIDv4, returned once, required for tracking, audit-logged

---

## Phase 3: Tier-2 risks (operational / UX) — 1–2h

### Compliance page + API
- [ ] `/compliance` page RBAC: non-admin → 403 on PATCH `/admin/tenants/:id`
- [ ] Audit log sanitization: passwords/tokens/card data redacted
- [ ] NDJSON append-only (no rotation)

### Drizzle snapshots
- [ ] `drizzle-snapshot-integrity.test.ts` passes
- [ ] `drizzle-kit-generate-smoke.test.ts` passes
- [ ] Fresh DB migration works: `pnpm db:migrate:fresh`

### COD fees
- [ ] Tier boundaries match owner-approved Q3
- [ ] Edge: order at exact threshold

### Tenant schema
- [ ] 26 columns nullable, no defaults
- [ ] Existing tenant with NULLs renders "Unknown" not "Compliant"

### Route migrations
- [ ] `route-migration-17-shipments.test.ts` green
- [ ] `route-migration-18-webhooks.test.ts` green
- [ ] `route-migration-19-subscriptions.test.ts` green
- [ ] Public contract preserved: 401/403/422/500 paths intact

### WCAG
- [ ] `tests/color-contrast.test.ts` (11 checks) green
- [ ] Manual Lighthouse audit ≥ 4.5:1 on hero/buttons/links

---

## Phase 4: Tier-3 (deferred P2) — 15 min

- [ ] Read `docs/ops/REFACTOR_PLAN_P2-1.md`
- [ ] Read `docs/ops/REFACTOR_PLAN_P2-2.md`
- [ ] Confirm 6 P2s are documented as deferred (not silently broken)

---

## Phase 5: Documentation review — 30 min

### Legal (lawyer review needed before publication)
- [ ] `docs/PRIVACY_POLICY.md` §2.4 — PDPL compliant
- [ ] `docs/TERMS_OF_SERVICE.md` §8.5 — SFDA disclaimer
- [ ] `docs/SFDA_DISCLAIMER.md` — food/cosmetics/health
- [ ] Cross-references: DPO contact, MoCI license, dispute resolution

### Owner briefs
- [ ] `docs/ops/OWNER_ACTION_G{1..10}_*.md` — 10 files, all present
- [ ] Each brief has: prerequisites, steps, external links, cost/time estimate

### Operational
- [ ] `docs/INCIDENT_RESPONSE.md`
- [ ] `docs/DEPLOYMENT_RUNBOOK.md`
- [ ] `docs/ZATCA_ROADMAP.md`
- [ ] `docs/SAUDI_COMPLIANCE_CHECKLIST.md`
- [ ] `docs/ops/BETA_LAUNCH_CHECKLIST.md`
- [ ] `docs/ops/BETA_LAUNCH_MONITORING.md`

---

## Phase 6: Working tree hygiene — 10 min

> These are uncommitted in the working tree. Decide before merge.

- [ ] `MASTER_ROADMAP.html` (M) — commit as `chore:` or stash
- [ ] `apps/admin-dashboard/vite.config.ts` (M) — commit or revert
- [ ] `apps/merchant-dashboard/vite.config.ts` (M) — commit or revert
- [ ] `storage/support-error-events.ndjson` (M) — add to `.gitignore` or commit
- [ ] `MARKETPLACE_AUDIT_REPORT.md` (??) — commit as `docs:`
- [ ] `docs/ops/THEME_MARKETPLACE_AUDIT_2026_06_17.md` (??) — commit as `docs:`

---

## Phase 7: Sign-off

- [ ] All Tier-1 risks addressed or accepted-with-reason
- [ ] All Tier-2 risks addressed or accepted-with-reason
- [ ] Tier-3 deferred items documented
- [ ] Tier-4 owner action items briefed (G1–G10)
- [ ] Working tree clean OR uncommitted items explicitly accepted
- [ ] Pre-launch smoke 29/29 green

**Reviewer sign-off:** _______________ Date: _______________

---

## One-liner shortcuts

```bash
# Full pre-flight (5 min)
pnpm preflight && pnpm typecheck && pnpm test

# Pre-launch smoke only (30s)
pnpm test tests/pre-launch-smoke.test.ts

# Tier-1 tests only
pnpm test tests/wallet-posting-service.test.ts \
          tests/wallet-posting-wiring.test.ts \
          tests/3ds-flow.test.ts \
          tests/3ds-storefront-flow.test.ts \
          tests/pdpl-endpoints-wiring.test.ts \
          tests/marketplace-p0-1-sfda-workflow.test.ts \
          tests/marketplace-p0-2-category-blocklist.test.ts \
          tests/marketplace-p0-3-access-token.test.ts \
          tests/marketplace-p0-4-demo-isolation.test.ts \
          tests/marketplace-p0-5-audit.test.ts \
          tests/marketplace-trust-badge.test.ts

# Ops sanity
pnpm ops:monitor
```

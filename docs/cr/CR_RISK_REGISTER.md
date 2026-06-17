# CR Risk Register — `feature/phase-9-cod-fee-policy` → `main`

> Every area a reviewer should look at twice. Ranked by **blast radius × likelihood**.

---

## 🔴 Tier 1 — Must scrutinize (financial / regulatory)

### R1.1 — `WalletPostingService` posting contract
- **Files:** `apps/api/src/services/wallet-posting-service.ts` + all migration call-sites
- **Risk:** Wallet drift = real money. A bug here can create double-debits, missing reversals, or unbalanced ledger.
- **Why it matters:** 6 routes were migrated to use this service. Any inconsistency between old and new behavior is a financial regression.
- **What to check:**
  - Read `wallet-posting-service.test.ts` (622 lines) — does it cover all 5 posting types (postPlatformFee, postGatewayFee, postSettlementDifference, postPayoutDebit, postPayoutReversal)?
  - For each migrated route (`refund`, `checkout`, `payment-webhook-service`), verify: idempotency key, error rollback, amount sign convention.
  - Confirm `GatewayFeeRefundPolicy` defaults per provider are correct (Geidea = ? Mada = ? Tabby = ?).
- **Acceptance bar:** Test suite green + a manual dry-run of one full refund flow (mocked).

### R1.2 — 3DS SAMA flow
- **Files:** `apps/api/src/routes/storefront/checkout.ts` + `apps/storefront/src/pages/checkout/*3DS*` + `packages/payment-providers/*/3ds*`
- **Risk:** SAMA mandates 3DS for online card transactions. Wrong status code = failed compliance audit + cards declined.
- **What to check:**
  - `requires_3ds` flag propagation: gateway → API → storefront
  - Callback URL signing / validation
  - Failure → fallback to non-3DS path (verify it's NOT happening — SAMA requires fail-closed, not fail-open)
  - Dev-only `Fake3DSChallenge` page MUST be `NODE_ENV !== 'production'` gated
- **Acceptance bar:** Live walk-through of success + decline + timeout paths in dev mode.

### R1.3 — PDPL data export + account deletion
- **Files:** `apps/api/src/routes/me/data-export.ts` + `account.ts`
- **Risk:** PDPL Art. 18 (data portability) and Art. 19 (right to erasure) are legally enforceable. Wrong scope = fine + reputational damage.
- **What to check:**
  - Data export covers ALL user data (orders, addresses, payment metadata, audit logs)?
  - Account deletion: 30-day grace period hard-enforced? Re-registration with same email blocked?
  - Sanitization: deleted user's data is purged from logs, analytics, backups (or flagged for retention)?
- **Acceptance bar:** Manual end-to-end test of both endpoints with a sandbox tenant.

### R1.4 — Marketplace trust badge gating
- **Files:** `apps/api/src/routes/haa-marketplace.ts` + `tests/marketplace-trust-badge.test.ts`
- **Risk:** Showing "متجر موثوق" to an unverified merchant = legal exposure (PDPL false claim) + user trust loss.
- **What to check:** The badge condition is `kycVerified === true` AND has a recent audit? What if KYC expires?
- **Acceptance bar:** Badge appears only on tenants that pass all KYC checks at the moment of render.

### R1.5 — Marketplace category blocklist
- **Files:** `apps/api/src/services/marketplace.ts` + migration 0059
- **Risk:** Adult/medical/weapons/hazardous in marketplace = legal shutdown.
- **What to check:** Blocklist is enforced at: (a) category creation, (b) product creation, (c) product edit, (d) marketplace listing query.
- **Acceptance bar:** All 4 layers have tests (confirmed: 8 tests in `marketplace-p0-2-category-blocklist.test.ts`).

### R1.6 — Marketplace order accessToken
- **Files:** `apps/api/src/routes/orders.ts` + `marketplace.ts`
- **Risk:** Without accessToken, any `/orders/:id` can be guessed → enumeration → PII leak.
- **What to check:** Token is UUIDv4 (not sequential)? Returned ONLY once at order creation? Required for tracking? Audit-logged on every view?
- **Acceptance bar:** Existing 6-test suite covers this; verify in code that token rotation on re-issue.

---

## 🟡 Tier 2 — Important (operational / UX / a11y)

### R2.1 — `/compliance` admin page RBAC
- **Files:** `apps/admin-dashboard/src/pages/Compliance.tsx` + `apps/api/src/routes/admin/tenants-stores.ts`
- **Risk:** Wrong role can edit G1–G10 fields = compliance metadata corruption.
- **What to check:** UI-side permission gate (already present) + **API-side permission check on PATCH** (verify not UI-only — this is a hard project rule from AGENTS.md).
- **Acceptance bar:** Non-admin role returns 403, not 200.

### R2.2 — Admin audit log sanitization
- **Files:** `apps/api/src/services/audit-log.ts`
- **Risk:** Logging passwords, tokens, or PII = security incident. AGENTS.md forbids this.
- **What to check:** Sanitization function strips: `password`, `token`, `secret`, `apiKey`, `card`, `cvv`, `authorization`. NDJSON append-only (no rotation overwrite).
- **Acceptance bar:** Fuzz test with realistic payload containing each pattern → confirm redacted.

### R2.3 — Drizzle snapshot synthesis
- **Files:** `packages/db/src/migrations/0050-0053` + `scripts/build-snapshots.cjs` + `tests/drizzle-snapshot-integrity.test.ts`
- **Risk:** This is a **workaround** for `Bud1` syntax error. If a new migration drops without snapshot, migration chain breaks silently.
- **What to check:** `drizzle-snapshot-integrity.test.ts` regression guard fires if snapshot missing. `drizzle-kit-generate-smoke.test.ts` catches FK format + prevId UUID bugs.
- **Acceptance bar:** Both tests pass. On a fresh DB, `drizzle-kit migrate` works end-to-end.

### R2.4 — COD fee policy (Phase 9)
- **Files:** `apps/api/src/services/cod-fees.ts` (or equivalent) + migration + tests
- **Risk:** Per-tenant fee calc bug = merchant either over-charges (refund burden) or under-charges (revenue loss).
- **What to check:** Tier boundaries (thresholds, amounts) match owner-approved Q3 decision. Edge case: order exactly at boundary.
- **Acceptance bar:** All tiers have positive + negative test cases.

### R2.5 — 26 new compliance columns on `tenants`
- **Files:** `packages/db/src/schema/tenants.ts` + migration 0061
- **Risk:** Nullable columns = OK, but if defaults are wrong, existing tenants get misleading "compliant" status.
- **What to check:** All 26 columns are nullable with no defaults (per audit). `/compliance` page renders correctly for pre-existing tenants with NULLs.
- **Acceptance bar:** Run a query against a sample existing tenant — UI shows "Unknown" not "Compliant" for null fields.

### R2.6 — Route migrations 17/18/19 (shipments, webhooks, subscriptions)
- **Files:** Route → Service refactor
- **Risk:** Refactor introduced subtle behavior change (middleware order, error handling, status codes).
- **What to check:** Test the public contract end-to-end, not just the unit. Verify 401/403/422/500 paths preserved.
- **Acceptance bar:** Migration test files (`route-migration-{17,18,19}-*.test.ts`) are present + green.

### R2.7 — Color contrast (WCAG AA)
- **Files:** Brand-primary darkened (commit `eac1b85b`)
- **Risk:** Visual regression if brand color is used in many components.
- **What to check:** `tests/color-contrast.test.ts` covers 11 component styles. Manually verify hero, buttons, links.
- **Acceptance bar:** All 11 tests pass + manual Lighthouse audit ≥ 4.5:1 contrast.

---

## 🟢 Tier 3 — Lower priority (deferred P2 backlog)

| Item | Documented in | Why deferred |
|---|---|---|
| P2-#1 LandingPage split | `REFACTOR_PLAN_P2-1.md` | Cosmetic; works correctly |
| P2-#2 Theme package architecture | `REFACTOR_PLAN_P2-2.md` | Migration risk > benefit |
| P2-#12 Onboarding wizard polish | (backlog) | YAGNI |
| (3 more P2s) | (backlog) | Various |

These do **not** block the merge. Document and revisit at T+30.

---

## 🟣 Tier 4 — External / owner action (not in this PR's code)

> These CANNOT be code-reviewed. They appear here as a reminder for the **owner**, not the reviewer.

| ID | Action | Owner | External dep |
|---|---|---|---|
| G1 | Commercial Registration (CR) | You | MoCI |
| G2 | VAT registration | You | ZATCA |
| G3 | E-commerce license | You | MoCI |
| G4 | DPO appointment + PDPL filing | You | Lawyer |
| G5 | Trademark filing | You | SAIP |
| G6 | PCI-DSS ASV scan | You | ASV vendor |
| G7 | Pen-test | You + firm | Pen-test firm |
| G8 | KSA hosting (or justify) | You | AWS Riyadh / STC |
| G9 | Tabby DPA | You | Tabby legal |
| G10 | DR plan + RPO/RTO | You | — |

---

## 🟠 Known issues in working tree (not in PR)

| Path | Action needed before merge |
|---|---|
| `MASTER_ROADMAP.html` (M) | Either commit as `chore: regenerate MASTER_ROADMAP` or stash |
| `apps/{admin,merchant}-dashboard/vite.config.ts` (MM) | Verify change intentional; commit or revert |
| `storage/support-error-events.ndjson` (M) | Add to `.gitignore` if not already (runtime log) |
| `MARKETPLACE_AUDIT_REPORT.md` (??) | Commit as `docs:` |
| `docs/ops/THEME_MARKETPLACE_AUDIT_2026_06_17.md` (??) | Commit as `docs:` |

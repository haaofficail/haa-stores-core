# Pull Request — TASK-0030 Configurable Platform Fee Policy

> **Note:** This repository has no `origin` remote configured. This file
> is the PR description the owner should paste into the platform's
> "Open PR" form when ready.

## Summary

Replace the hardcoded `* 0.02` platform-fee calculation with a
**per-store configurable policy** that supports 4 modes (none /
percentage / fixed / percentage_plus_fixed). Each order's
`platform_fee` wallet entry carries an immutable snapshot of the rate
+ fixed amount that produced it, so changing a store's policy
**never re-prices historical orders**.

**Branch:** `feature/configurable-platform-fee-policy`
**Base:** `quality-pass-5-exec-route-10-dashboard` (or your stable
default branch — see "Merge strategy" below)

## Commits

| # | SHA | Description |
|---|-----|-------------|
| 1 | `cd574944` | TASK-0030 core: schema, service, API, admin UI, merchant UI, tests |
| 2 | `c2820c98` | Fresh-DB bootstrap script — resolves the merge gate |

## Test evidence

- `pnpm preflight` → **PASSED** (all 21 packages typecheck clean)
- `pnpm vitest run tests/platform-fees.test.ts tests/platform-fees-wiring.test.ts`
  → **57/57 passing**
- `pnpm test` → **2145 passing**, 5 pre-existing failures
  (unrelated to this PR; they predate TASK-0030 and live on the base
  branch)
- `pnpm --filter @haa/{db,wallet-core,commerce-core,api,admin-dashboard,merchant-dashboard,storefront} build`
  → all green
- `scripts/bootstrap-fresh-db.sh bootstrap_e2e` on a brand-new DB:
  53 SQL files applied, 97 public tables, `drizzle.__drizzle_migrations`
  has 52 rows, `store_billing_settings` schema correct,
  `wallet_entries` has all 3 fee columns.
  Subsequent `pnpm db:migrate` on the bootstrapped DB:
  "migrations applied successfully!" (idempotent no-op).

## Files Changed

### Schema (2 new files + 2 modified)
- ✨ `packages/db/src/schema/billing.ts` — new `storeBillingSettings` table
- ✨ `packages/db/src/migrations/0050_store_billing_settings.sql` — table + default 2% seed
- ✨ `packages/db/src/migrations/0051_wallet_fee_snapshot.sql` — fee-snapshot columns
- ✏️ `packages/db/src/schema/wallet.ts` — added `feeRatePct`, `feeFixed`, `feeSource`
- ✏️ `packages/db/src/schema/index.ts` — re-export
- ✏️ `packages/db/src/migrations/meta/_journal.json` — entries 0050, 0051

### Pure logic (2 new files)
- ✨ `packages/wallet-core/src/platform-fees.ts` — `PlatformFeeMode`, `calcPlatformFee`, `validatePlatformFeePolicyInput`, `describePlatformFeePolicy`
- ✨ `packages/commerce-core/src/billing-settings-service.ts` — `StoreBillingSettingsService`

### Checkout refactor (2 modified)
- ✏️ `packages/commerce-core/src/checkout.ts` — read policy at order creation, snapshot to fee entry
- ✏️ `apps/api/src/routes/webhooks.ts` — same path in payment webhook

### API + UI (5 new + 5 modified)
- ✨ `apps/api/src/routes/admin/billing-settings.ts` — GET/PATCH admin endpoints
- ✨ `apps/admin-dashboard/src/pages/StoreBillingSettings.tsx` — admin UI
- ✏️ `apps/api/src/routes/admin/index.ts` — mount new routes
- ✏️ `apps/admin-dashboard/src/App.tsx` — nav entry + route
- ✏️ `apps/admin-dashboard/src/lib/api.ts` — `getStoreBillingSettings` / `updateStoreBillingSettings`
- ✏️ `apps/api/src/routes/wallet.ts` — expose read-only `platformFee` in merchant summary
- ✏️ `apps/merchant-dashboard/src/pages/Wallet.tsx` — read-only policy transparency card

### Shared types (3 modified)
- ✏️ `packages/shared/src/types/orders.ts` — added `'store_billing_settings_updated'` to `AuditAction` + `'billing.platform_fee.read'/'update'` to `Permission`
- ✏️ `packages/shared/src/types/audit.ts` — Arabic label
- ✏️ `packages/shared/src/permissions.ts` — admin billing entries in catalog

### Tests (2 new)
- ✨ `tests/platform-fees.test.ts` — 33 unit tests
- ✨ `tests/platform-fees-wiring.test.ts` — 24 wiring tests

### Bootstrap (2 new, resolves merge gate)
- ✨ `scripts/bootstrap-fresh-db.sh` — two-pass fresh-DB bootstrap
- ✨ `scripts/record-migration-hashes.mjs` — drizzle-orm migrator wrapper

### Docs (4 modified)
- ✏️ `docs/ops/DECISIONS.md` — DECISION-0007 + resolution
- ✏️ `docs/ops/CURRENT_STATE.md` — TASK-0030 in Active + Open
- ✏️ `docs/ops/CHANGELOG_INTERNAL.md` — 2026-06-16 entry
- ✏️ `docs/ops/TASK_TRACKER.md` — TASK-0030 entry

## Checklist (per task brief acceptance criteria)

- [x] No hardcoded `0.02` platform-fee in `checkout.ts` or `webhooks.ts`
- [x] `store_billing_settings` table created, default 2% seed for every store
- [x] `wallet_entries` fee-snapshot columns added
- [x] `calcPlatformFee` covers all 4 modes + edge cases
- [x] Checkout reads policy, snapshots to fee entry, skips when 0
- [x] Admin GET/PATCH `/admin/stores/:storeId/billing-settings` with permission gate
- [x] Validation rejects negative values, mode-specific required fields
- [x] Merchant wallet summary includes read-only `platformFee` object
- [x] Merchant `Wallet.tsx` shows transparent read-only card (no edit controls)
- [x] Admin dashboard page at `/store-billing` with full edit form
- [x] `store_billing_settings_updated` audit log on every PATCH
- [x] Structured `fees: { platform, paymentProcessing, total }` block
- [x] Backward compat: flat `platformFees` / `paymentFees` fields still returned
- [x] 57 new tests passing, 0 regressions on typecheck + preflight
- [x] Fresh-DB bootstrap verified end-to-end on a brand-new database

## Merge strategy

1. **Do not squash.** Keep the 2 commits separate. The first is the
   feature; the second is the bootstrap script.
2. **Review focus**:
   - **Schema** (`packages/db/src/schema/billing.ts`) — check the
     unique constraint on `store_id`, the audit fields.
   - **`calcPlatformFee`** — check rounding behavior on edge cases.
   - **Service** (`billing-settings-service.ts`) — check the audit
     log is unconditional.
   - **Admin route** — check the permission gate, the validation.
   - **Merchant UI** — confirm no edit affordances exist.
3. **After merge**, on any environment that needs a fresh DB:
   ```bash
   ./scripts/bootstrap-fresh-db.sh <new_db_name>
   ```
4. **Future `drizzle-kit generate` work**: when someone needs to add
   the missing `0050_*_snapshot.json` / `0051_*_snapshot.json` files,
   they can hand-synthesize from `0049_snapshot.json` using the
   shape documented in `MEMORY.md` (drizzle-kit snapshot
   workaround), or use the bootstrap script to apply the changes
   on a reference DB and then run `drizzle-kit generate` to get
   proper snapshots.

## Out of scope (intentionally)

- Tiered billing plans, marketplace-specific fees, volume discounts
- Removing the flat `platformFees` / `paymentFees` fields from the
  wallet summary (kept for backward compat)
- `payment_fee_adjustment` as a new `WalletEntryType` (no-op SUM was
  removed from the structured response — flagged for future)
- Production deployment, email/SMS notifications, automated payouts

## Risks

- **Service-layer budget** (14/14): kept at the cap by moving
  `drizzle-orm` imports to the service layer (the
  `StoreBillingSettingsService.getStoreSummary` helper).
- **Pre-existing test failures on the base branch** (5 tests):
  unrelated to TASK-0030; documented in CHANGELOG.
- **No remote configured** in this repo: the user opens the PR
  manually using this file as the description.

## Related

- `docs/ops/DECISIONS.md` — DECISION-0007 (full context + resolution)
- `docs/ops/TASK_TRACKER.md` — TASK-0030 entry with test results
- `docs/ops/CHANGELOG_INTERNAL.md` — 2026-06-16 entry

# Release 1 Review Gate Report

## Summary

Release 1 implements the core commerce domain: products, categories, customers, cart, checkout (with fake payment), orders, shipping, wallet ledger, and storefront public API. All 9 packages build and typecheck with zero errors.

## Multi-Tenancy Security

**Issue**: `requireStoreAccess()` middleware extracted `storeId` from the route param or JWT but never verified the param storeId matched the user's `activeStoreId`. A user with `activeStoreId=1` could access `/merchant/2/products` and read another tenant's data.

**Fix**: `packages/auth-core/src/middleware.ts:45-47` — When `storeId` comes from the route param, the middleware now compares it against `activeStoreId` from the JWT. If they differ, it returns 403.

## Public Storefront Safety

**Issue 1**: The storefront served content regardless of store status. Suspended/closed stores were still accessible via `/s/:slug`.

**Fix**: `apps/api/src/routes/storefront.ts:31-39` — `resolveActiveStore()` checks `store.status === 'active' && store.isActive === true` before serving content, returning 403 for inactive stores.

**Issue 2**: Product `cost` (purchase cost) was exposed to public API consumers.

**Fix**: `apps/api/src/routes/storefront.ts:13-20` — `toPublicProduct()` strips the `cost` field from all storefront product responses.

## Checkout Idempotency

**Issue**: The `confirm` endpoint had no idempotency guard. Duplicate POST requests could process the same session twice.

**Fix**: `packages/commerce-core/src/checkout.ts:101-106` — Before creating an order, `confirm()` now queries for an existing order with the same `checkoutSessionId`. If found, it returns the existing order as an idempotent success response.

## Transaction Safety

**Issue**: `WalletLedger.recordEntry()` was called using `this.walletLedger` which created its own database connection outside the outer `db.transaction()`. Wallet entries would not roll back on failure.

**Fix**: `packages/commerce-core/src/checkout.ts:161,167` — Inside the transaction, a new `WalletLedger(tx)` is created for wallet operations, ensuring all wallet writes participate in the same atomic transaction as order creation and payment processing.

## Order State Machine

Verified all 23 valid transitions and 15 invalid transitions. Terminal states (`cancelled`, `refunded`) correctly have no outgoing transitions.

| From | Valid To |
|------|----------|
| `draft` | `checkout_started`, `pending_payment`, `cancelled` |
| `checkout_started` | `pending_payment`, `cancelled` |
| `pending_payment` | `confirmed`, `cancelled`, `refunded` |
| `confirmed` | `processing`, `cancelled`, `refunded` |
| `processing` | `ready_to_ship`, `cancelled` |
| `ready_to_ship` | `shipped`, `cancelled` |
| `shipped` | `delivered`, `returned_to_sender`, `cancelled` |
| `delivered` | `completed`, `returned` |
| `completed` | `returned`, `refunded` |
| `returned` | `refunded` |
| `cancelled` | (terminal) |
| `refunded` | (terminal) |
| `partially_refunded` | `refunded`, `completed` |

## Test Results

```
 ✓ tests/storefront-safety.test.ts      (7 tests)
 ✓ tests/checkout.test.ts               (10 tests)
 ✓ tests/multi-tenancy.test.ts          (8 tests)
 ✓ tests/order-state-machine.test.ts    (49 tests)
 ────────────────────────────────────────────────
   Total: 74 passed, 4 files
```

## Build Verification

```
pnpm -r build      → 9 packages, all pass
pnpm -r typecheck  → 9 packages, all pass
```

## Outstanding Items

- Real payment integration (stripe/others) — out of scope for MVP
- Real shipping carrier API integration — out of scope for MVP
- Docker infrastructure for MinIO (blocked by no Docker on dev machine)
- WCAG 2.1 AA audit — deferred to frontend UI release
- Load testing — deferred to staging deployment

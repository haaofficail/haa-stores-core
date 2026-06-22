# Loyalty System — Integration Audit & Roadmap

> Snapshot: 2026-06-22 · branch: `chore/merchant-dashboard-per-page-audit`
> Method: read-only discovery across `packages/loyalty-core`, `packages/commerce-core/src/loyalty.ts`, `packages/db/src/schema/loyalty.ts`, `apps/api/src/routes/loyalty.ts`, merchant-dashboard pages, storefront checkout. No src edits in this pass.

---

## TL;DR

**Loyalty is ~35% complete: the foundation is solid, but the user-facing integration is 0%.**

- ✅ Pure math layer (loyalty-core) — production-grade, decimal-safe, fully tested.
- ✅ DB schema + migration `0071_loyalty.sql` — proper ledger with idempotency index.
- ✅ Settings CRUD route mounted at `/merchant/:storeId/loyalty/settings`.
- ✅ `LoyaltyService` class (305 LOC) and `consumeFifo` helper in `commerce-core`.
- ❌ **`LoyaltyService` is not called from anywhere in `apps/`.** Dead code path today.
- ❌ No `earn` route. No `redeem` route. No `transactions` (ledger view) route.
- ❌ No hook in order completion → customers never actually earn points.
- ❌ No hook in checkout → customers can't redeem points.
- ❌ No merchant-dashboard page. No Sidebar nav entry.
- ❌ No storefront UI (balance, redemption widget).
- ❌ No cron for expiry automation. No analytics. No customer notification on earn/redeem/expire.

**Verdict:** the schema + math + service class are loaded into the binary but never reach a merchant or a customer. Closing the loop is roughly 8–10 PRs of work, split below into P0/P1/P2.

---

## 1. What exists today (verbatim)

### 1.1 `packages/loyalty-core/src/index.ts` (179 LOC)

Pure math layer — no DB, no I/O. Uses `decimal.js` for currency safety.

Exports:
- `LoyaltyRules` interface (9 settings)
- `DEFAULT_LOYALTY_RULES` (sensible defaults; `enabled: false`)
- `computeEarnedPoints(rules, amounts)` — earn calculation respecting min-order, tax/shipping toggles
- `pointsToValue(rules, points)` — points → currency (rounded down to halalas)
- `valueToPoints(rules, value)` — currency → minimum points needed
- `computeRedemption(rules, req)` — full redemption with balance cap + max-percent-of-order cap + min-redeem floor
- `computeExpiry(rules, lots, asOf)` — FIFO expiry from earn lots

Quality: production-grade. `decimal.js` everywhere. Edge cases (disabled, below_min, insufficient_balance, no_redeemable_value) returned as typed reasons.

### 1.2 `packages/commerce-core/src/loyalty.ts` (305 LOC)

`LoyaltyService` class + `consumeFifo` helper.

`LoyaltyService` methods (inferred from exports — to be confirmed when wiring):
- account lookup + auto-creation
- earn transaction (writes `loyalty_transactions` + updates `loyalty_accounts.balance`)
- redeem transaction (FIFO consume from earn lots; respects `computeRedemption`)
- expire transaction (sweep lots older than `pointsExpiryMonths`)

**Critical finding:** `grep -rln "consumeFifo\|computeEarnedPoints\|computeRedemption" apps/` returns ZERO hits. The service is never instantiated outside its own tests.

### 1.3 `packages/db/src/schema/loyalty.ts` (62 LOC) + `0071_loyalty.sql`

Three tables:
- `loyalty_settings` — one row per store; unique on `store_id`
- `loyalty_accounts` — one row per (store, customer); unique compound index
- `loyalty_transactions` — immutable ledger with `balance_before`/`balance_after`
  - Partial unique index `loyalty_tx_earn_order_uniq` on `(store_id, reference_id) WHERE type='earn' AND reference_type='order'` — same idempotency pattern as wallet_entries.

Schema quality: matches the wallet ledger pattern (per `docs/agent-os/WALLET_IDEMPOTENCY_PLAN.md`). Solid.

### 1.4 `apps/api/src/routes/loyalty.ts` (56 LOC, 4 endpoints)

Mounted at `apps/api/src/index.ts:378` → `app.route('/merchant/:storeId/loyalty', loyaltyRouter)`.

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET  | `/settings` | `promotions:read` | Read store rules |
| PUT  | `/settings` | `promotions:update` | Update store rules |
| GET  | `/customers/:customerId` | `promotions:read` | Read customer balance |
| POST | `/customers/:customerId/expire` | `promotions:update` | Manually trigger expiry sweep |

That's it. **No `earn`, no `redeem`, no `transactions` (ledger), no `top-customers` analytics.**

### 1.5 Tests (4 files)

- `tests/loyalty-core.test.ts` — math layer
- `tests/loyalty-schema.test.ts` — schema source-grep
- `tests/loyalty-service.test.ts` — commerce-core service
- `tests/loyalty-routes-wiring.test.ts` — route mount + permission

Coverage of the math + schema + service is good. Coverage of the **integration paths** (order → earn, checkout → redeem) is zero, because those paths don't exist.

---

## 2. What is missing (the actual gaps)

| # | Gap | Severity | Why |
|---|---|---|---|
| L-001 | No `POST /loyalty/customers/:customerId/earn` route | **P0** | Without it, the only way to earn is to call `LoyaltyService` directly from order completion — and that hook doesn't exist either. |
| L-002 | No `POST /loyalty/customers/:customerId/redeem` route | **P0** | Customers cannot use their points. |
| L-003 | No order-completion hook calling `LoyaltyService.earn(...)` | **P0** | This is the load-bearing wire: a completed order should write an earn transaction with `reference_type='order'`, `reference_id=<orderId>`. |
| L-004 | No checkout-time redeem in storefront `Checkout.tsx` | **P0** | Customer chooses "Use X points" → checkout calls `LoyaltyService.redeem(...)` → discount applied to order total. |
| L-005 | No `GET /loyalty/customers/:customerId/transactions` (ledger view) | **P1** | Both merchant ops (dispute) and customer self-service ("where did my points go") need this. |
| L-006 | No merchant-dashboard `Loyalty.tsx` page | **P1** | Settings cannot be configured today; merchant has no view of program health. |
| L-007 | No Sidebar nav entry for loyalty | **P1** | Even after L-006, merchant can't reach the page. |
| L-008 | No storefront customer-facing balance UI | **P1** | Customer doesn't know they have points; no incentive loop. |
| L-009 | No checkout `Apply Points` widget on storefront | **P1** | Companion to L-004 — UI side of redemption. |
| L-010 | No cron for `pointsExpiryMonths` automation | **P2** | The `/expire` route is manual. Without a cron, expired points sit indefinitely. |
| L-011 | No outbound webhook on `loyalty.earned` / `loyalty.redeemed` / `loyalty.expired` | **P2** | Merchants on the integrations track can't notify customers via WhatsApp/email of point activity. |
| L-012 | No analytics (active accounts, redemption rate, breakage rate) | **P2** | Merchant has no way to evaluate program ROI. |
| L-013 | No tier system (Bronze / Silver / Gold) | **P2** | Pure points-only; competitors offer tier benefits. Out of scope for v1. |
| L-014 | No referral / signup bonus earn types | **P2** | The schema's `type` field allows it (varchar 20); the math doesn't enforce a fixed set. Add `type='referral'` + `type='signup_bonus'`. |
| L-015 | No customer notification on earn / redeem / expire | **P2** | UX gap — customers should hear when they earn or are about to lose points. |
| L-016 | No tests for L-001..L-004 routes / hooks | **P1** | Closing the loop without tests is how silent regressions enter prod. |

---

## 3. Roadmap — closure plan

### Phase 1 — Critical wiring (P0, ~3 PRs)

| PR | Title | Scope | Risk |
|---|---|---|---|
| L-PR-1 | feat(loyalty): wire earn on order completion | Add `LoyaltyService.earn()` call inside the order-completion path. Use the partial-unique index for idempotency (the same order can't earn twice). Add a test that fires `complete_order` and asserts a single earn row exists. | Touches the order completion happy path. **MUST run wallet/regression suite + new loyalty integration test before merge.** |
| L-PR-2 | feat(loyalty): expose earn / redeem / transactions routes | `POST /loyalty/customers/:customerId/earn` (admin-only, manual), `POST .../redeem`, `GET .../transactions?cursor=...`. RBAC: `promotions:update` for write, `promotions:read` for read. Idempotency-key header required on POSTs. | Medium — three new routes; one is a write path; one returns paginated ledger. |
| L-PR-3 | feat(loyalty): apply redeemed points to storefront checkout | Storefront `Checkout.tsx` calls `POST /loyalty/customers/:customerId/redeem` with the order total; the returned `value` is applied as a discount; the order metadata stores the redeem transaction id for refund undo. | High — touches money math in checkout. **Refund flow must also undo the redeem (restore the points).** Add property-test on (earn, redeem, refund) cycle = net zero. |

### Phase 2 — UI exposure (P1, ~3 PRs)

| PR | Title | Scope |
|---|---|---|
| L-PR-4 | feat(merchant-dashboard): Loyalty page | New `apps/merchant-dashboard/src/pages/Loyalty.tsx`: settings form (all `LoyaltyRules` fields), enable toggle, "preview earn for a 100 SAR order" inline calculator. RBAC-guarded. |
| L-PR-5 | feat(merchant-dashboard): Loyalty Sidebar entry + Customer drill-down | Sidebar nav under `التسويق` group. Customer profile page → "Loyalty" section showing balance + paginated ledger (uses L-PR-2's `GET /transactions`). |
| L-PR-6 | feat(storefront): customer balance + redeem widget | Account page shows balance + lifetime stats + recent ledger (last 10). Checkout shows "Apply <N> points (= <V> SAR)" widget when `enabled && balance >= minRedeemPoints`. Server validates against `computeRedemption`. |

### Phase 3 — Automation + integrations (P2, ~3 PRs)

| PR | Title | Scope |
|---|---|---|
| L-PR-7 | feat(loyalty): cron expiry sweep | BullMQ recurring job. Calls per-store `/expire` for stores with `pointsExpiryMonths > 0`. **Blocked on Redis provisioning** (PROBLEM-003). |
| L-PR-8 | feat(loyalty): outbound webhook events | `loyalty.earned`, `loyalty.redeemed`, `loyalty.expired` events fired through the existing `outbound-webhooks.ts` pipeline. Lets the WhatsApp/email integration notify customers. |
| L-PR-9 | feat(loyalty): analytics & top customers | Merchant `Reports.tsx` adds a "Loyalty" tab: active accounts, points outstanding, redemption rate, breakage rate, top earners. SQL-only — no new table. |

### Phase 4 — Optional / nice-to-have (P3)

- Tier system (Bronze / Silver / Gold thresholds with multipliers + perks).
- Referral / signup-bonus earn types.
- Birthday bonus.
- Per-product or per-category earn multipliers.

---

## 4. Risk register for the closure work

- **R1 — Money math correctness on redeem.** The `computeRedemption` function is sound, but the storefront → API → DB chain must NEVER let a discount exceed the value returned. Counter: server is source of truth; client only displays.
- **R2 — Idempotency on earn.** Partial unique index handles double-firing of order completion. But what about partial refund (re-earn lower amount)? Need a documented rule: refund triggers a `redeem`-type compensating row, not a delete on the earn row.
- **R3 — Refund undoes redeem.** Each order's redeem reference id must be persisted so a refund can restore the points. Add to `orders` metadata.
- **R4 — Race condition: simultaneous redeem + earn on the same customer.** Both touch `loyalty_accounts.balance`. Use the ledger as the source of truth, not `balance` column (which is a denormalized projection). Recompute balance on each transaction.
- **R5 — Expiry sweep concurrency.** Cron must be a singleton per store. Without Redis (PROBLEM-003 still owner-gated), the sweep is at best a manual `/expire` POST.
- **R6 — Brand visibility in merchant UI.** Per the brand-fidelity guard (`tests/merchant-dashboard-brand-fidelity.test.ts`), any new Loyalty.tsx page must use the primary scale. No new indigo/violet.

---

## 5. Owner-gated dependencies

- **PROBLEM-003 (Redis/BullMQ)** — blocks L-PR-7 (cron expiry).
- **PROBLEM-005 (transactional email)** — blocks meaningful L-015 customer notifications via email channel.
- **db:migrate execution** — `0071_loyalty.sql` migration file is on `main` but needs the owner to run `pnpm db:migrate` on staging before any of L-PR-1..6 can be tested against real data. Per AGENTS.md §14.7, only the owner runs migrations.

---

## 6. What we will NOT do without explicit approval

- Open all 9 PRs at once. The plan is **L-PR-1 → L-PR-2 → L-PR-3** first (the critical wiring), then we pause for owner review before phase 2.
- Run `pnpm db:migrate`. The migration file exists; execution is owner-only.
- Wire live notifications (SMS/email/WhatsApp) — those depend on PROBLEM-005 owner setup.
- Touch the wallet ledger. Loyalty has its own ledger; the two systems must stay isolated.

---

## 7. Quick verification commands (for the next session)

```bash
# Confirm the dead-path finding (no apps/ caller of LoyaltyService):
grep -rln 'LoyaltyService\|consumeFifo' apps/

# Confirm the schema is present on staging (owner-side):
ssh deploy@72.61.108.208 "docker compose -p haa-staging exec -T postgres \
  psql -U haa -d haastores -c '\\dt loyalty_*'"

# Confirm no UI surface exists today:
grep -rln 'loyalty\|Loyalty\|نقاط' apps/merchant-dashboard/src/pages apps/storefront/src/pages
```

---

_Reviewed by: agent · Status: AWAITING OWNER APPROVAL for Phase 1 scope_

# Wallet Ledger

## Source of Truth

**Wallet entries (`walletEntries`) are the sole source of truth for all balances.**
- `walletAccounts` stores cached balances for performance — updated atomically within the same transaction as each entry.
- All reporting, summaries, and payout eligibility derive from entries, not the cached balance.
- The cached balance is a read-optimized mirror. If it diverges, entries always win.

## Overview

Wallet provides a double-entry ledger for all financial transactions per store.

## Entry Types

| Type | Direction | Description |
|------|-----------|-------------|
| `sale` | `credit` | Customer payment for order |
| `platform_fee` | `debit` | Platform commission (2% of total) |
| `payment_fee` | `debit` | Payment gateway fee |
| `refund` | `debit` | Money returned to customer |
| `payout` | `debit` | Store owner withdrawal |
| `manual_adjustment` | `credit` / `debit` | Admin corrections |
| `shipping_credit` | `credit` / `debit` | Shipping cost adjustments |

## Account Balances

Each store has a single `wallet_account` with three balance fields:

- **balance**: Total lifetime balance (all entries)
- **pending_balance**: Funds awaiting settlement
- **available_balance**: Funds ready for payout

## Record Flow (Checkout — Phase 2: Payments Integration)

### Success Flow
1. `confirmPayment()` returns `status: 'paid'` → triggers wallet entries
2. `sale` entry (credit) = order total
3. `platform_fee` 2% entry (debit) = `round(order_total * 0.02 * 100) / 100`
4. Both entries use `status: 'available'` (instant settlement in MVP)
5. All entries created in **same DB transaction** as payment+order update

### Failure Flow
- Failed payment (`status: 'failed'`) → **no wallet entries created**
- Order remains unpaid
- Payment record marked as `failed`

### Webhook-Triggered Flow
1. Webhook `payment.succeeded` received → same success flow as above
2. Duplicate webhooks ignored via idempotency key → wallet entries created exactly once
3. Webhook `payment.failed` → no wallet entries, order updated to failed

### Refund Flow
1. `POST /merchant/:storeId/orders/:orderId/refund` called
2. Validates: order must be paid, refund amount ≤ paid amount
3. Provider `refundPayment()` called → wallet reversal entry (debit) for refunded amount
4. Full refund → order status `refunded`, payment status `refunded`
5. Partial refund → payment status `partially_refunded`

## Transaction Safety

All wallet entries use the **same database transaction** as order/payment updates. If any step fails, the entire transaction (including wallet entries) rolls back atomically.

`WalletLedger` accepts an optional `DbClient` parameter to participate in outer transactions:
```ts
const txWallet = new WalletLedger(tx);
await txWallet.recordEntry({ ... });
```

## Platform Fee Calculation

```
fee = round(order_total * 0.02 * 100) / 100
```

Example: order of SAR 219.00 → fee of SAR 4.38

## Shipping Ledger Impact (Phase 3)

- **Shipping fee charged to customer** is part of order total (existing checkout flow)
- **Shipment creation** records shipping costs on shipment record (shippingCost, customerFee, merchantCost, platformCost columns) — no automatic wallet entry
- **Duplicate label** does NOT create duplicate wallet entries (idempotent by shipment ID)
- **Returns** create return shipment records only — no automatic refund/reversal (payment domain handles refunds)
- **Return fees** are placeholder (documented, not charged)
- **COD ledger** deferred to later phase
- **Real carrier shipping fees** deferred to OTO live integration
- **Wallet entry type `shipping_fee`** exists in schema but only used manually for now

Current Phase 3 approach: shipping costs exist on order and shipment records. Wallet ledger entries for shipping remain manual/deferred until real carrier integration.

## LC2C Enhancements

### Enhanced Summary

`getSummary()` now computes fields from entries (not just account balance):

- `totalSales` — sum of sale credits
- `platformFees` — sum of platform_fee debits
- `paymentFees` — sum of payment_fee debits
- `shippingFees` — sum of shipping_fee debits
- `refunds` — sum of refund debits
- `payouts` — sum of payout debits
- `netBalance` — sales - all fees - refunds - payouts
- `entryCount` — total number of entries
- `lastUpdated` — timestamp of most recent entry

### Entry Filters

`getEntries()` supports:

- `type` — filter by entry type (sale, platform_fee, etc.)
- `direction` — filter by credit/debit
- `status` — filter by status (pending, available, settled, cancelled)
- `dateFrom` / `dateTo` — date range filter
- `search` — search in description and referenceType
- `page` / `limit` — pagination
- Results ordered by `createdAt DESC`
- All queries scoped by `storeId`

### Merchant Dashboard UX

- 10 summary cards in responsive grid
- Explanation box in Arabic for non-accounting merchants
- Entries table with colored amounts (green=credit, red=debit)
- Type icons for each entry type
- Status badges
- Order link when referenceType=order
- Payout disabled with clear Arabic explanation
- Filters: type, direction, status, date range, search
- Pagination with page info

- `wallet_account_id` → FK to wallet_accounts
- `type` + `direction` categorise the entry
- `amount` + `balance_before` + `balance_after` for audit trail
- `reference_type` / `reference_id` links to order, payout, etc.

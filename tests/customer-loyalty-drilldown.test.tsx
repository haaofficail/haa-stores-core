// L-PR-5 — Customer profile drill-down ledger guard.
//
// Closes audit gap "no merchant-side ledger surface". After PR #94
// shipped GET /merchant/:storeId/loyalty/customers/:customerId/transactions
// the merchant dashboard now lets staff open a customer row and inspect:
//   - current points balance + monetary value
//   - lifetime stats (earned / redeemed / expired) — derived from the
//     loaded rows (no new aggregation endpoint)
//   - paginated ledger with a "Load more" button driven by nextCursor
//
// This test is a static-source inspection (the same style as
// merchant-loyalty-page-wired.test.ts and shipping-rate-edit-delete
// .test.tsx) — the vitest setup runs in node without jsdom, so we lock
// the structural contract instead of rendering. The assertions cover:
//
//   1. lib/api.ts exposes `loyaltyApi.getTransactions(storeId, customerId, { cursor, limit })`.
//   2. Customers.tsx imports the new `loyaltyApi` symbol + types.
//   3. The row action button is `data-testid="customer-loyalty-btn"` and
//      is gated by `promotions:read` (NOT customers:update — different
//      permission surface).
//   4. The drilldown dialog renders `customer-loyalty-drawer`,
//      `loyalty-summary-balance`, `loyalty-lifetime-stats`, the three
//      lifetime testids (earned/redeemed/expired), and the load-more
//      button `loyalty-load-more-btn`.
//   5. The page never bypasses request() with raw fetch (consistent
//      with the existing brand-fidelity / lint rules).
//
// If anyone refactors Customers.tsx and removes the loyalty surface,
// this test must keep failing until the refactor restores the contract
// or the audit gap is documented closed.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const PAGE = readFileSync(resolve(ROOT, 'apps/merchant-dashboard/src/pages/Customers.tsx'), 'utf8');
const API = readFileSync(resolve(ROOT, 'apps/merchant-dashboard/src/lib/api.ts'), 'utf8');

describe('Customers — loyalty drilldown (L-PR-5)', () => {
  it('exports loyaltyApi.getTransactions with cursor + limit on /transactions', () => {
    expect(API).toMatch(/getTransactions:\s*\(\s*storeId/);
    expect(API).toMatch(/\/merchant\/\$\{storeId\}\/loyalty\/customers\/\$\{customerId\}\/transactions/);
    expect(API).toMatch(/cursor/);
    expect(API).toMatch(/limit/);
  });

  it('exposes typed LoyaltyTxRow + LoyaltyCustomerSummary + LoyaltyTransactionsPage', () => {
    expect(API).toMatch(/export interface LoyaltyTxRow/);
    expect(API).toMatch(/export interface LoyaltyCustomerSummary/);
    expect(API).toMatch(/export interface LoyaltyTransactionsPage/);
    // nextCursor is the contract from the server (PR #94).
    expect(API).toMatch(/nextCursor:\s*number\s*\|\s*null/);
  });

  it('Customers.tsx imports loyaltyApi + the loyalty types', () => {
    expect(PAGE).toMatch(/import\s*\{[^}]*\bloyaltyApi\b[^}]*\}\s*from\s*['"]@\/lib\/api['"]/);
    expect(PAGE).toMatch(/LoyaltyCustomerSummary/);
    expect(PAGE).toMatch(/LoyaltyTxRow/);
  });

  it('row exposes a customer-loyalty-btn gated by promotions:read', () => {
    expect(PAGE).toMatch(/data-testid="customer-loyalty-btn"/);
    // The button must live inside a PermissionGate with promotions:read
    // (matches the API route's RBAC for /loyalty/customers/:id).
    const btnIdx = PAGE.indexOf('data-testid="customer-loyalty-btn"');
    const before = PAGE.slice(Math.max(0, btnIdx - 400), btnIdx);
    expect(before).toMatch(/<PermissionGate[^>]*permission="promotions:read"/);
  });

  it('renders the drilldown drawer + summary + lifetime stats + load more', () => {
    expect(PAGE).toMatch(/data-testid="customer-loyalty-drawer"/);
    expect(PAGE).toMatch(/data-testid="loyalty-summary-balance"/);
    expect(PAGE).toMatch(/data-testid="loyalty-lifetime-stats"/);
    expect(PAGE).toMatch(/data-testid="loyalty-lifetime-earned"/);
    expect(PAGE).toMatch(/data-testid="loyalty-lifetime-redeemed"/);
    expect(PAGE).toMatch(/data-testid="loyalty-lifetime-expired"/);
    expect(PAGE).toMatch(/data-testid="loyalty-ledger-list"/);
    expect(PAGE).toMatch(/data-testid="loyalty-load-more-btn"/);
  });

  it('uses loyaltyApi.getCustomer + getTransactions, not raw fetch', () => {
    expect(PAGE).toMatch(/loyaltyApi\.getCustomer\(/);
    expect(PAGE).toMatch(/loyaltyApi\.getTransactions\(/);
    expect(PAGE).not.toMatch(/\bfetch\(/);
  });

  it('derives lifetime stats client-side from earn/redeem/expire types', () => {
    // The reducer (loyaltyLifetime) must inspect each row.type so that
    // the partial ledger we have loaded yields a stable summary.
    expect(PAGE).toMatch(/r\.type === ['"]earn['"]/);
    expect(PAGE).toMatch(/r\.type === ['"]redeem['"]/);
    expect(PAGE).toMatch(/r\.type === ['"]expire['"]/);
  });
});

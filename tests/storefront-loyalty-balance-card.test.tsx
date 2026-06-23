// L-PR-6 — Storefront customer balance card guard.
//
// `apps/storefront/src/components/LoyaltyBalanceCard.tsx` is the
// customer-facing surface for the loyalty program: it shows the
// customer's current points balance, the nominal monetary value, the
// three lifetime stats (earned / redeemed / expired), and the last N
// ledger entries. The server is the single source of truth for value
// math (computeRedemption + pointsToValue live in @haa/loyalty-core);
// this widget only renders what `loyaltyApi.getBalance` returns.
//
// Same static-source pattern as merchant-loyalty-page-wired.test.ts.
// The vitest setup runs in node without jsdom — we lock the structural
// contract instead of rendering DOM. Assertions:
//
//   1. loyaltyApi.getBalance exists on storefront lib/api.ts and hits
//      /s/${slug}/loyalty/balance with phone as the identifier.
//   2. loyaltyApi.quoteRedeem exists, POSTs to /s/${slug}/loyalty/redeem-quote.
//   3. The card component exports a default React component.
//   4. The card renders the testids that downstream tests rely on:
//      loyalty-balance-card, loyalty-balance-points, loyalty-balance-value,
//      loyalty-lifetime-earned/redeemed/expired, loyalty-ledger-list,
//      loyalty-ledger-row.
//   5. The card hides (returns null) when the server says enabled=false
//      — this is the contract that lets the storefront use the widget
//      unconditionally; merchants without loyalty see nothing.
//   6. No raw fetch; everything goes through `request()` in lib/api.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const API = readFileSync(resolve(ROOT, 'apps/storefront/src/lib/api.ts'), 'utf8');
const CARD = readFileSync(resolve(ROOT, 'apps/storefront/src/components/LoyaltyBalanceCard.tsx'), 'utf8');

describe('Storefront LoyaltyBalanceCard (L-PR-6)', () => {
  it('exports loyaltyApi.getBalance hitting /s/:slug/loyalty/balance?phone=…', () => {
    expect(API).toMatch(/export const loyaltyApi\s*=/);
    expect(API).toMatch(/getBalance:[\s\S]*?\/s\/\$\{slug\}\/loyalty\/balance\?phone=/);
    expect(API).toMatch(/encodeURIComponent\(phone\)/);
  });

  it('exports loyaltyApi.quoteRedeem POSTing to /s/:slug/loyalty/redeem-quote', () => {
    expect(API).toMatch(/quoteRedeem:[\s\S]*?\/s\/\$\{slug\}\/loyalty\/redeem-quote/);
    expect(API).toMatch(/quoteRedeem:[\s\S]*?method:\s*['"]POST['"]/);
  });

  it('exposes typed LoyaltyBalanceResponse with rules + lifetime stats + recent', () => {
    expect(API).toMatch(/export interface LoyaltyBalanceResponse/);
    expect(API).toMatch(/enabled:\s*boolean/);
    expect(API).toMatch(/balance:\s*number/);
    expect(API).toMatch(/lifetimeEarned:\s*number/);
    expect(API).toMatch(/lifetimeRedeemed:\s*number/);
    expect(API).toMatch(/lifetimeExpired:\s*number/);
    expect(API).toMatch(/recent:\s*LoyaltyLedgerRow\[\]/);
    expect(API).toMatch(/export interface LoyaltyRedeemQuote/);
  });

  it('LoyaltyBalanceCard.tsx exports a default React component', () => {
    expect(CARD).toMatch(/export default function LoyaltyBalanceCard/);
    expect(CARD).toMatch(/import\s*\{[^}]*loyaltyApi[^}]*\}\s*from\s*['"]@\/lib\/api['"]/);
  });

  it('renders the required testids for downstream tests', () => {
    expect(CARD).toMatch(/data-testid="loyalty-balance-card"/);
    expect(CARD).toMatch(/data-testid="loyalty-balance-points"/);
    expect(CARD).toMatch(/data-testid="loyalty-balance-value"/);
    expect(CARD).toMatch(/data-testid="loyalty-lifetime-earned"/);
    expect(CARD).toMatch(/data-testid="loyalty-lifetime-redeemed"/);
    expect(CARD).toMatch(/data-testid="loyalty-lifetime-expired"/);
    expect(CARD).toMatch(/data-testid="loyalty-ledger-list"/);
    expect(CARD).toMatch(/data-testid="loyalty-ledger-row"/);
  });

  it('hides when feature disabled OR no customer account (returns null)', () => {
    // The render contract: if data is null or enabled === false, return null.
    expect(CARD).toMatch(/!data\.enabled/);
    expect(CARD).toMatch(/return null/);
  });

  it('uses loyaltyApi.getBalance, never raw fetch', () => {
    expect(CARD).toMatch(/loyaltyApi\.getBalance\(/);
    expect(CARD).not.toMatch(/\bfetch\(/);
  });

  it('shows lifetime stats inside a single section, labelled by heading', () => {
    expect(CARD).toMatch(/aria-labelledby="loyalty-card-heading"/);
    expect(CARD).toMatch(/id="loyalty-card-heading"/);
  });
});

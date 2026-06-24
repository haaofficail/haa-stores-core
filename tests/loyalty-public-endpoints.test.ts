// Loyalty public endpoints (storefront-facing).
//
// Locks the contract for the 3 endpoints exposed under
// `/s/:slug/loyalty/*` — settings, balance, redeem-quote. The
// storefront LoyaltyBalanceCard + Checkout redeem widget consume
// these endpoints; before this PR they hit 404 and silently hid.
//
// Source-grep only. The actual end-to-end behaviour is exercised by
// the existing loyalty service tests under tests/wallet-lc2c.test.ts
// and the merchant-side loyalty routes test.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/storefront/loyalty-public.ts'),
  'utf-8',
);

describe('Public loyalty endpoints (storefront)', () => {
  describe('endpoint registration', () => {
    it('GET /:slug/loyalty/settings is registered', () => {
      expect(SRC).toMatch(/loyaltyPublicRouter\.get\(['"]\/:slug\/loyalty\/settings['"]/);
    });

    it('GET /:slug/loyalty/balance is registered (was orphan before this PR)', () => {
      expect(SRC).toMatch(/loyaltyPublicRouter\.get\(['"]\/:slug\/loyalty\/balance['"]/);
    });

    it('POST /:slug/loyalty/redeem-quote is registered (was orphan before this PR)', () => {
      expect(SRC).toMatch(/loyaltyPublicRouter\.post\(\s*['"]\/:slug\/loyalty\/redeem-quote['"]/);
    });
  });

  describe('service-layer compliance', () => {
    it('routes via LoyaltyService — no direct drizzle import', () => {
      expect(SRC).toMatch(/from\s+['"]@haa\/commerce-core['"]/);
      expect(SRC).toMatch(/LoyaltyService/);
      expect(SRC).not.toMatch(/from\s+['"]drizzle-orm['"]/);
    });

    it('phone resolution goes through CustomersService.findByPhone', () => {
      expect(SRC).toMatch(/CustomersService/);
      expect(SRC).toMatch(/findByPhone/);
    });
  });

  describe('security guards', () => {
    it('balance: unknown phone returns zero balance, not 404 (no enumeration)', () => {
      // The handler MUST short-circuit to a non-404 response when
      // findByPhone returns null. We assert the presence of a zero
      // balance branch immediately after the lookup.
      const balanceBlock = SRC.slice(
        SRC.indexOf(".get('/:slug/loyalty/balance'"),
        SRC.indexOf(".post(\n  '/:slug/loyalty/redeem-quote'"),
      );
      expect(balanceBlock).toMatch(/balance:\s*0/);
      // No `404` in the unknown-customer path.
      const unknownPathStart = balanceBlock.indexOf('if (!customer)');
      const unknownPathEnd = balanceBlock.indexOf('const [balance');
      const unknownBlock = balanceBlock.slice(unknownPathStart, unknownPathEnd);
      expect(unknownBlock).not.toMatch(/404/);
    });

    it('redeem-quote: unknown phone returns insufficient_balance (no enumeration)', () => {
      const quoteBlock = SRC.slice(SRC.indexOf(".post(\n  '/:slug/loyalty/redeem-quote'"));
      expect(quoteBlock).toMatch(/insufficient_balance/);
      // Unknown-customer branch must not be a 404 either.
      const unknownStart = quoteBlock.indexOf('if (!customer)');
      const unknownEnd = quoteBlock.indexOf('previewRedemption');
      const block = quoteBlock.slice(unknownStart, unknownEnd);
      expect(block).not.toMatch(/404/);
    });

    it('redeem-quote: returns SERVER-AUTHORITATIVE value, not client math', () => {
      // The handler must use loyalty.previewRedemption (the server-side
      // computation) and return its `value`. Never trust the client.
      expect(SRC).toMatch(/previewRedemption/);
      expect(SRC).toMatch(/value:\s*quote\.value/);
    });

    it('settings: does NOT expose internal-only fields', () => {
      const settingsBlock = SRC.slice(
        SRC.indexOf(".get('/:slug/loyalty/settings'"),
        SRC.indexOf(".get('/:slug/loyalty/balance'"),
      );
      expect(settingsBlock).not.toMatch(/pointsExpiryMonths/);
      expect(settingsBlock).not.toMatch(/earnOnTax/);
      expect(settingsBlock).not.toMatch(/earnOnShipping/);
    });
  });

  describe('input validation', () => {
    it('redeem-quote body is validated by zod', () => {
      expect(SRC).toMatch(/zValidator/);
      expect(SRC).toMatch(/redeemQuoteSchema/);
      expect(SRC).toMatch(/points:\s*z\.number\(\)\.int\(\)\.nonnegative/);
    });

    it('balance requires the `phone` query param', () => {
      const balanceBlock = SRC.slice(
        SRC.indexOf(".get('/:slug/loyalty/balance'"),
        SRC.indexOf(".post(\n  '/:slug/loyalty/redeem-quote'"),
      );
      expect(balanceBlock).toMatch(/c\.req\.query\(['"]phone['"]\)/);
      expect(balanceBlock).toMatch(/BAD_REQUEST/);
    });
  });
});

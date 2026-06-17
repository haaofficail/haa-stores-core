// VAT-Aware Pricing — TASK-0035 sub-item 6
//
// ZATCA requires 15% VAT to be visible on tax invoices. Merchants need
// to display prices with VAT clarity in the storefront and checkout
// summary so the customer sees the total inclusive of VAT before
// confirming the order.
//
// This test covers the contract for the VAT helpers:
//
//   1. priceIncVat: add VAT to a base price (price ex-VAT → price inc-VAT)
//   2. priceExVat: extract VAT from a gross price (price inc-VAT → price ex-VAT)
//   3. vatAmount: compute the VAT component of a price
//   4. formatVatLine: format the VAT line for a receipt / order summary
//   5. formatPriceIncVatLabel: format the price with VAT badge ("شامل الضريبة")
//   6. Edge cases: zero price, negative rate (must reject), rounding
//   7. Saudi Arabia default rate is 15% (ZATCA standard)
//   8. Custom rate support (env-driven) for future jurisdiction support

import { describe, it, expect } from 'vitest';
import {
  priceIncVat,
  priceExVat,
  vatAmount,
  formatVatLine,
  formatPriceIncVatLabel,
  DEFAULT_VAT_RATE,
  isValidVatRate,
} from '@haa/commerce-core';

describe('VAT Helpers (ZATCA 15%)', () => {
  describe('priceIncVat (base ex-VAT → total inc-VAT)', () => {
    it('100 SAR ex-VAT → 115 SAR inc-VAT at 15%', () => {
      expect(priceIncVat(100, 0.15)).toBe(115);
    });

    it('rounds to 2 decimal places (avoid floating-point noise)', () => {
      expect(priceIncVat(99.99, 0.15)).toBe(114.99);
      expect(priceIncVat(33.33, 0.15)).toBe(38.33);
    });

    it('zero price returns zero', () => {
      expect(priceIncVat(0, 0.15)).toBe(0);
    });

    it('zero rate returns the base price unchanged', () => {
      expect(priceIncVat(100, 0)).toBe(100);
    });

    it('uses the default 15% rate when no rate is provided', () => {
      expect(priceIncVat(100)).toBe(115);
    });
  });

  describe('priceExVat (gross inc-VAT → base ex-VAT)', () => {
    it('115 SAR inc-VAT → 100 SAR ex-VAT at 15%', () => {
      expect(priceExVat(115, 0.15)).toBe(100);
    });

    it('rounds to 2 decimal places', () => {
      expect(priceExVat(114.99, 0.15)).toBe(99.99);
    });

    it('zero price returns zero', () => {
      expect(priceExVat(0, 0.15)).toBe(0);
    });

    it('round-trip ex→inc→ex preserves the original value', () => {
      const base = 199.99;
      const gross = priceIncVat(base, 0.15);
      const back = priceExVat(gross, 0.15);
      expect(back).toBeCloseTo(base, 2);
    });
  });

  describe('vatAmount (compute the VAT component)', () => {
    it('100 SAR ex-VAT at 15% → 15 SAR VAT', () => {
      expect(vatAmount(100, 0.15)).toBe(15);
    });

    it('200 SAR ex-VAT at 15% → 30 SAR VAT', () => {
      expect(vatAmount(200, 0.15)).toBe(30);
    });

    it('115 SAR inc-VAT at 15% → 15 SAR VAT (extracted from gross)', () => {
      expect(vatAmount(115, 0.15, { inclusive: true })).toBe(15);
    });

    it('zero rate returns zero VAT', () => {
      expect(vatAmount(100, 0)).toBe(0);
    });
  });

  describe('formatVatLine (receipt / order summary line)', () => {
    it('renders the VAT line with Arabic label and 15% rate', () => {
      const line = formatVatLine(100, 0.15, 'ar');
      expect(line).toMatch(/ضريبة القيمة المضافة|15/);
      expect(line).toContain('15.00');
    });

    it('renders English label by default (en)', () => {
      const line = formatVatLine(100, 0.15);
      expect(line).toMatch(/VAT/);
    });

    it('includes the VAT amount in the line', () => {
      const line = formatVatLine(100, 0.15, 'ar');
      expect(line).toContain('15.00');
    });
  });

  describe('formatPriceIncVatLabel (product card "شامل الضريبة" badge)', () => {
    it('Arabic: returns price + "شامل الضريبة" badge', () => {
      const label = formatPriceIncVatLabel(115, 'ar');
      expect(label.price).toBe('115.00');
      expect(label.badge).toBe('شامل الضريبة');
    });

    it('English: returns price + "VAT included" badge', () => {
      const label = formatPriceIncVatLabel(115, 'en');
      expect(label.price).toBe('115.00');
      expect(label.badge).toBe('VAT included');
    });
  });

  describe('DEFAULT_VAT_RATE (ZATCA Saudi Arabia standard)', () => {
    it('is 0.15 (15%)', () => {
      expect(DEFAULT_VAT_RATE).toBe(0.15);
    });
  });

  describe('isValidVatRate (defense-in-depth)', () => {
    it('accepts 0.15 (ZATCA standard)', () => {
      expect(isValidVatRate(0.15)).toBe(true);
    });

    it('accepts 0 (zero-rated)', () => {
      expect(isValidVatRate(0)).toBe(true);
    });

    it('rejects negative rates', () => {
      expect(isValidVatRate(-0.05)).toBe(false);
    });

    it('rejects rates above 1 (100%)', () => {
      expect(isValidVatRate(1.5)).toBe(false);
    });

    it('rejects NaN', () => {
      expect(isValidVatRate(NaN)).toBe(false);
    });

    it('rejects Infinity', () => {
      expect(isValidVatRate(Infinity)).toBe(false);
    });
  });
});

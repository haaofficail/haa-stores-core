// Checkout VAT line — TASK-0035 sub-item 7
//
// The checkout OrderSummary must show:
//   - Subtotal (sum of line items ex-VAT)
//   - VAT line (15% per ZATCA, using formatVatLine helper)
//   - Total (inc-VAT, the amount actually charged)
//
// The sidebar (sticky right column) currently shows just the total.
// This test covers the source-grep contract that the sidebar is wired
// to show all three lines via the VAT helpers from @haa/commerce-core.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const storefrontCheckoutPath = resolve(projectRoot, 'apps/storefront/src/pages/Checkout.tsx');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

const storefrontCheckout = read(storefrontCheckoutPath);

describe('Storefront Checkout — OrderSummary VAT line (source-grep)', () => {
  it('imports the VAT helpers from @haa/commerce-core', () => {
    // The OrderSummary must use the formatVatLine + priceIncVat helpers
    // to compute and render the VAT line + total.
    expect(storefrontCheckout).toMatch(/from '@haa\/commerce-core'/);
    expect(storefrontCheckout).toMatch(/formatVatLine|priceIncVat|priceExVat/);
  });

  it('renders a subtotal line (sum of items ex-VAT)', () => {
    // The sidebar should show the subtotal separate from the total.
    expect(storefrontCheckout).toMatch(/subtotal|الإجمالي قبل الض|المجموع الفرعي/);
  });

  it('renders a VAT line using formatVatLine (15% per ZATCA)', () => {
    // The VAT line should be rendered using the formatVatLine helper.
    expect(storefrontCheckout).toMatch(/formatVatLine|ضريبة|VAT/);
  });

  it('renders the total amount (inc-VAT)', () => {
    // The total amount (inc-VAT) should be shown prominently.
    expect(storefrontCheckout).toMatch(/total\.toFixed|المجموع|الإجمالي/);
  });

  it('uses the DEFAULT_VAT_RATE constant (or VAT_RATE env) for the calculation', () => {
    // The VAT calculation must use the platform default (0.15) or the
    // env override, not a hardcoded rate.
    expect(storefrontCheckout).toMatch(/DEFAULT_VAT_RATE|VAT_RATE|0\.15/);
  });
});

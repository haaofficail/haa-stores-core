// Subscription VAT contract.
//
// Subscription invoices were being persisted with `vatAmount: '0'`,
// producing invalid invoices for any subscription over the ZATCA
// threshold. Saudi law requires 15% VAT on the prorated amount with
// the VAT recorded in its own column.
//
// Audit reference: P0 #4 (2026-06-25).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../packages/commerce-core/src/subscriptions.ts'),
  'utf-8',
);

describe('Subscription VAT — ZATCA-compliant proration invoice', () => {
  it('imports the shared vatAmount + DEFAULT_VAT_RATE helpers', () => {
    expect(SRC).toMatch(/import\s*\{[^}]*vatAmount[^}]*\}\s*from\s*['"]\.\/vat\.js['"]/);
    expect(SRC).toMatch(/import\s*\{[^}]*DEFAULT_VAT_RATE[^}]*\}\s*from\s*['"]\.\/vat\.js['"]/);
  });

  it('the hard-coded `vatAmount: \'0\'` is gone', () => {
    expect(SRC).not.toMatch(/vatAmount:\s*['"]0['"]/);
  });

  it('proration invoice computes VAT via vatAmount() on the prorated amount', () => {
    expect(SRC).toMatch(/const\s+vat\s*=\s*vatAmount\(Number\(proratedAmount\),\s*DEFAULT_VAT_RATE\)\.toFixed\(2\)/);
  });

  it('total = prorated + VAT (matches the ZATCA invoice schema)', () => {
    // The invoice row's total column must include VAT; the old code
    // wrote `total: proratedAmount` (no VAT). The new code adds them.
    expect(SRC).toMatch(/const\s+totalWithVat\s*=\s*\(Number\(proratedAmount\)\s*\+\s*Number\(vat\)\)\.toFixed\(2\)/);
    expect(SRC).toMatch(/total:\s*totalWithVat/);
  });
});

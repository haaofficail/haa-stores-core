// Source-grep wiring tests for TASK-0032 (Phase 9: COD fee policy).
//
// Mirrors `tests/platform-fees-wiring.test.ts` (TASK-0030). The purpose
// is not to test behavior (that's in `tests/cod-fees.test.ts`) but to
// ensure the call sites stay wired correctly across future refactors.
// If a future commit removes the policy-driven `collectCOD` flow, this
// test fails loudly.

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

describe('COD fee — module surface', () => {
  it('cod-fees.ts module exists in wallet-core', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'packages/wallet-core/src/cod-fees.ts'))).toBe(true);
  });

  it('cod-fees.ts is re-exported from wallet-core index', () => {
    const index = read('packages/wallet-core/src/index.ts');
    expect(index).toMatch(/from\s+['"]\.\/cod-fees\.js['"]/);
    expect(index).toMatch(/calcCodFee/);
    expect(index).toMatch(/CodFeePolicy/);
  });
});

describe('COD fee — migration 0053', () => {
  it('migration file exists and adds the 4 expected columns', () => {
    const sql = read('packages/db/src/migrations/0053_cod_fee_policy.sql');
    expect(sql).toMatch(/cod_fee_mode/);
    expect(sql).toMatch(/cod_fee_pct/);
    expect(sql).toMatch(/cod_fee_fixed/);
    expect(sql).toMatch(/is_cod_fee_enabled/);
  });

  it('migration adds the 50% CHECK cap constraint', () => {
    const sql = read('packages/db/src/migrations/0053_cod_fee_policy.sql');
    expect(sql).toMatch(/store_billing_settings_cod_pct_cap/);
    expect(sql).toMatch(/0\.5/);
  });

  it('migration is idempotent (uses IF NOT EXISTS)', () => {
    const sql = read('packages/db/src/migrations/0053_cod_fee_policy.sql');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS/);
  });
});

describe('COD fee — schema', () => {
  it('storeBillingSettings schema includes the 4 new fields', () => {
    const schema = read('packages/db/src/schema/billing.ts');
    expect(schema).toMatch(/codFeeMode/);
    expect(schema).toMatch(/codFeePct/);
    expect(schema).toMatch(/codFeeFixed/);
    expect(schema).toMatch(/isCodFeeEnabled/);
  });
});

describe('COD fee — call site (orders.ts:321)', () => {
  it('orders.ts imports calcCodFee + describeCodFeePolicy from wallet-core', () => {
    const orders = read('packages/commerce-core/src/orders.ts');
    expect(orders).toMatch(/calcCodFee/);
    expect(orders).toMatch(/describeCodFeePolicy/);
  });

  it('orders.ts imports StoreBillingSettingsService', () => {
    const orders = read('packages/commerce-core/src/orders.ts');
    expect(orders).toMatch(/StoreBillingSettingsService/);
  });

  it('orders.ts calls getCodFeePolicy inside collectCOD transaction', () => {
    const orders = read('packages/commerce-core/src/orders.ts');
    expect(orders).toMatch(/getCodFeePolicy/);
  });

  it('orders.ts no longer contains the hardcoded `0.02` literal', () => {
    const orders = read('packages/commerce-core/src/orders.ts');
    // Look for "* 0.02" or "* 0.02" patterns in the collectCOD call site.
    // We allow "0.02" to appear in JSDoc comments but not in the fee
    // calculation itself.
    const codFeeCalculation = orders.match(/type:\s*['"]cod_fee['"][\s\S]{0,400}amount:/);
    expect(codFeeCalculation).not.toBeNull();
    if (codFeeCalculation) {
      expect(codFeeCalculation[0]).not.toMatch(/\*\s*0\.02/);
    }
  });

  it('orders.ts collects the fee via calcCodFee (not literal multiplication)', () => {
    const orders = read('packages/commerce-core/src/orders.ts');
    // The new code stores the calculated value into a local before recordEntry.
    expect(orders).toMatch(/const\s+codFeeAmount\s*=\s*calcCodFee/);
  });
});

describe('COD fee — billing service surface', () => {
  it('StoreBillingSettingsService exposes getCodFeePolicy', () => {
    const service = read('packages/commerce-core/src/billing-settings-service.ts');
    expect(service).toMatch(/async\s+getCodFeePolicy/);
  });
});

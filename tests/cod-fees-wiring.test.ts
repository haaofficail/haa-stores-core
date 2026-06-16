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

describe('COD fee — call site (orders.ts:321, refactored to WalletPostingService in TASK-0033)', () => {
  it('orders.ts uses WalletPostingService for the cod_fee entry', () => {
    // After TASK-0033, the inline calcCodFee + describeCodFeePolicy calls
    // moved into WalletPostingService.postCodFee. The call site should
    // use the service, not the raw calculation.
    const orders = read('packages/commerce-core/src/orders.ts');
    expect(orders).toMatch(/WalletPostingService/);
  });

  it('orders.ts imports StoreBillingSettingsService for the policy lookup', () => {
    const orders = read('packages/commerce-core/src/orders.ts');
    expect(orders).toMatch(/StoreBillingSettingsService/);
  });

  it('orders.ts calls getCodFeePolicy inside collectCOD transaction', () => {
    const orders = read('packages/commerce-core/src/orders.ts');
    expect(orders).toMatch(/getCodFeePolicy/);
  });

  it('orders.ts no longer has inline `calcCodFee(...)` calls (moved to service)', () => {
    // After TASK-0033, calcCodFee lives only in WalletPostingService.
    const orders = read('packages/commerce-core/src/orders.ts');
    expect(orders).not.toMatch(/calcCodFee/);
  });
});

describe('COD fee — billing service surface', () => {
  it('StoreBillingSettingsService exposes getCodFeePolicy', () => {
    const service = read('packages/commerce-core/src/billing-settings-service.ts');
    expect(service).toMatch(/async\s+getCodFeePolicy/);
  });
});

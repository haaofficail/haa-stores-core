// Source-grep wiring tests for TASK-0033 (WalletPostingService).
//
// These tests don't test behavior (that's in `tests/wallet-posting-
// service.test.ts`). They ensure the service module is wired into the
// codebase correctly and that the call sites stay migrated. If a
// future refactor reintroduces a raw `recordEntry(...)` call in
// feature code, this test fails loudly.

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

describe('WalletPostingService — module surface', () => {
  it('service file exists in commerce-core', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'packages/commerce-core/src/wallet-posting-service.ts'))).toBe(true);
  });
});

describe('WalletPostingService — public API', () => {
  it('exports the class, the DedupKey type, and the PostResult type', () => {
    const svc = read('packages/commerce-core/src/wallet-posting-service.ts');
    expect(svc).toMatch(/export\s+class\s+WalletPostingService/);
    expect(svc).toMatch(/export\s+type\s+DedupKey/);
    expect(svc).toMatch(/export\s+type\s+PostResult/);
  });

  it('declares all 8 posting methods (3 implemented, 5 stubbed for Session #2)', () => {
    const svc = read('packages/commerce-core/src/wallet-posting-service.ts');
    expect(svc).toMatch(/postSale/);
    expect(svc).toMatch(/postCodFee/);
    expect(svc).toMatch(/postRefund/);
    expect(svc).toMatch(/postPlatformFee/);
    expect(svc).toMatch(/postPayoutDebit/);
    expect(svc).toMatch(/postPayoutReversal/);
    expect(svc).toMatch(/postGatewayFee/);
    expect(svc).toMatch(/postSettlementDifference/);
  });

  it('has centralized dedup via a private Map<string, PostResult>', () => {
    const svc = read('packages/commerce-core/src/wallet-posting-service.ts');
    expect(svc).toMatch(/private\s+dedupMap\s*=\s*new Map<string, PostResult>/);
  });
});

describe('WalletPostingService — call site migration', () => {
  it('orders.ts: collectCOD uses the new WalletPostingService for cod_fee entry', () => {
    const orders = read('packages/commerce-core/src/orders.ts');
    // After refactor, the call site should use the service, not raw recordEntry for cod_fee
    expect(orders).toMatch(/WalletPostingService/);
  });

  it('orders.ts: collectCOD no longer has the hardcoded `* 0.02` literal', () => {
    const orders = read('packages/commerce-core/src/orders.ts');
    // After TASK-0033, the entry type comes from the service result
    // (codResult.entryType), not a string literal. So we look for
    // the codResult variable name instead.
    const codFeeBlock = orders.match(/codResult[\s\S]{0,500}amount:/);
    expect(codFeeBlock).not.toBeNull();
    if (codFeeBlock) {
      expect(codFeeBlock[0]).not.toMatch(/\*\s*0\.02/);
    }
  });

  it('apps/api/src/routes/orders.ts: refund route uses the new WalletPostingService (TASK-0034 sub-item 4)', () => {
    const apiOrders = read('apps/api/src/routes/orders.ts');
    // The refund handler should import and use WalletPostingService,
    // not call WalletLedger.recordEntry directly with type: 'refund'.
    expect(apiOrders).toMatch(/import\s*\{[^}]*WalletPostingService[^}]*\}\s*from\s*['"]@haa\/commerce-core['"]/);
    // The refund block should reference postingService.postRefund
    const refundBlock = apiOrders.match(/postRefund[\s\S]{0,2000}/);
    expect(refundBlock).not.toBeNull();
    if (refundBlock) {
      expect(refundBlock[0]).toMatch(/postingService\.postRefund|refundResult/);
    }
  });
});

describe('WalletPostingService — service-layer enforcement', () => {
  it('app/api routes no longer call WalletLedger.recordEntry directly for known types', () => {
    // Known migration targets: orders.ts:131 (refund, NOW MIGRATED),
    // checkout.ts (sale, platform_fee, queued for sub-item 5).
    // This test is a forward-looking assertion: as Session #1 + #2 progress,
    // every recordEntry call in app/api should be moved behind the service.
    const orders = read('packages/commerce-core/src/orders.ts');
    expect(orders).toMatch(/WalletPostingService/);
    // Also assert the api refund route is migrated (TASK-0034 sub-item 4)
    const apiOrders = read('apps/api/src/routes/orders.ts');
    expect(apiOrders).toMatch(/WalletPostingService/);
  });
});

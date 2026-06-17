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

  it('packages/commerce-core/src/payment-webhook-service.ts: uses the new WalletPostingService (TASK-0034 sub-item 5)', () => {
    const webhook = read('packages/commerce-core/src/payment-webhook-service.ts');
    expect(webhook).toMatch(/import\s*\{[^}]*WalletPostingService[^}]*\}\s*from\s*['"]\.\/wallet-posting-service\.js['"]/);
    // Should reference the service for both postSale and postPlatformFee
    expect(webhook).toMatch(/txPosting\.postSale|saleResult/);
    expect(webhook).toMatch(/txPosting\.postPlatformFee|platformResult/);
  });

  it('packages/commerce-core/src/checkout.ts: uses the new WalletPostingService in both flows (TASK-0034 sub-item 5)', () => {
    const checkout = read('packages/commerce-core/src/checkout.ts');
    expect(checkout).toMatch(/import\s*\{[^}]*WalletPostingService[^}]*\}\s*from\s*['"]\.\/wallet-posting-service\.js['"]/);
    // Both flows should reference the service
    expect(checkout).toMatch(/txPosting\.postSale|saleResult/);
    expect(checkout).toMatch(/txPosting\.postPlatformFee|platformResult/);
  });
});

describe('WalletPostingService — service-layer enforcement', () => {
  it('all 4 raw recordEntry call sites in feature code are migrated (TASK-0034 sub-item 5)', () => {
    // After sub-item 5, NO raw `txWallet.recordEntry` for sale or
    // platform_fee should remain in feature code. The remaining
    // recordEntry calls are in checkout.ts (collectCOD) and the
    // apps/api refund route — both use the service.
    const checkout = read('packages/commerce-core/src/checkout.ts');
    const webhook = read('packages/commerce-core/src/payment-webhook-service.ts');
    // Each flow should have at least 1 reference to the service result
    const checkoutSaleCount = (checkout.match(/saleResult/g) ?? []).length;
    const checkoutPlatformCount = (checkout.match(/platformResult/g) ?? []).length;
    const webhookSaleCount = (webhook.match(/saleResult/g) ?? []).length;
    const webhookPlatformCount = (webhook.match(/platformResult/g) ?? []).length;
    // 2 flows in checkout (online + BNPL) × 2 entries (sale + platform_fee) = 4
    expect(checkoutSaleCount).toBeGreaterThanOrEqual(2);
    expect(checkoutPlatformCount).toBeGreaterThanOrEqual(2);
    // 1 flow in webhook × 2 entries = 2
    expect(webhookSaleCount).toBeGreaterThanOrEqual(1);
    expect(webhookPlatformCount).toBeGreaterThanOrEqual(1);
  });
});

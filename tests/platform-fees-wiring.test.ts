// Configurable Platform Fee Policy — integration & wiring tests
//
// Source-grep tests that verify the wiring is in place across packages:
//   - schema + migrations exist
//   - checkout no longer has hardcoded 0.02 platform-fee calculation
//   - audit action 'store_billing_settings_updated' is in the union + labels
//   - admin route has GET + PATCH for billing-settings
//   - merchant wallet summary exposes platformFee
//   - structured fees block is in the wallet summary
//   - service exists and accepts the correct policy shape

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

describe('Schema + migrations', () => {
  it('store_billing_settings schema is exported from @haa/db', () => {
    const schema = read('packages/db/src/schema/billing.ts');
    expect(schema).toContain('storeBillingSettings');
    expect(schema).toContain('platformFeeMode');
    expect(schema).toContain('platformFeePct');
    expect(schema).toContain('platformFeeFixed');
    expect(schema).toContain('isPlatformFeeEnabled');
    expect(schema).toContain('changeReason');
    expect(schema).toContain('updatedBy');
    // Default seed is in the migration, not the schema.
  });

  it('migration 0050 creates the table and seeds default policy', () => {
    const sql = read('packages/db/src/migrations/0050_store_billing_settings.sql');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "store_billing_settings"');
    expect(sql).toContain("'percentage'");
    expect(sql).toContain('0.02');
    expect(sql).toContain('ON CONFLICT');
  });

  it('migration 0051 adds fee-snapshot columns to wallet_entries', () => {
    const sql = read('packages/db/src/migrations/0051_wallet_fee_snapshot.sql');
    expect(sql).toContain('ALTER TABLE "wallet_entries" ADD COLUMN IF NOT EXISTS "fee_rate_pct"');
    expect(sql).toContain('ALTER TABLE "wallet_entries" ADD COLUMN IF NOT EXISTS "fee_fixed"');
    expect(sql).toContain('ALTER TABLE "wallet_entries" ADD COLUMN IF NOT EXISTS "fee_source"');
  });

  it('wallet_entries schema exposes feeRatePct, feeFixed, feeSource', () => {
    const schema = read('packages/db/src/schema/wallet.ts');
    expect(schema).toContain("feeRatePct:");
    expect(schema).toContain("feeFixed:");
    expect(schema).toContain("feeSource:");
  });

  it('billing schema is re-exported from schema/index.ts', () => {
    const idx = read('packages/db/src/schema/index.ts');
    expect(idx).toContain("export * from './billing.js'");
  });

  it('drizzle journal lists both new migrations', () => {
    const journal = read('packages/db/src/migrations/meta/_journal.json');
    expect(journal).toContain('"tag": "0050_store_billing_settings"');
    expect(journal).toContain('"tag": "0051_wallet_fee_snapshot"');
  });
});

describe('Audit action wired', () => {
  it("'store_billing_settings_updated' is in the AuditAction union", () => {
    const orders = read('packages/shared/src/types/orders.ts');
    expect(orders).toContain("'store_billing_settings_updated'");
  });
  it("'store_billing_settings_updated' has an Arabic label", () => {
    const labels = read('packages/shared/src/types/audit.ts');
    expect(labels).toContain('store_billing_settings_updated:');
    expect(labels).toMatch(/store_billing_settings_updated:\s*'[^']+'/);
  });
});

describe('calcPlatformFee + service module', () => {
  it('exports PlatformFeeMode, PlatformFeePolicy, calcPlatformFee from wallet-core', () => {
    const idx = read('packages/wallet-core/src/index.ts');
    expect(idx).toContain('calcPlatformFee');
    expect(idx).toContain('PlatformFeeMode');
    expect(idx).toContain('PlatformFeePolicy');
  });

  it('exports StoreBillingSettingsService from commerce-core', () => {
    const idx = read('packages/commerce-core/src/index.ts');
    expect(idx).toContain('StoreBillingSettingsService');
  });

  it('billing-settings-service lives in commerce-core and uses AuditLogService', () => {
    const svc = read('packages/commerce-core/src/billing-settings-service.ts');
    expect(svc).toContain('AuditLogService');
    expect(svc).toContain("action: 'store_billing_settings_updated'");
    expect(svc).toContain('oldValue:');
    expect(svc).toContain('newValue:');
  });
});

describe('Checkout wiring — no hardcoded platform fee', () => {
  it('checkout.ts has no hardcoded 0.02 platform-fee calculation', () => {
    const checkout = read('packages/commerce-core/src/checkout.ts');
    // After the refactor there should be no `* 0.02` for platform-fee purposes
    // in this file. We tolerate references inside `wallet-core/src/platform-fees.ts`
    // (the default policy) but the checkout must compute from the policy.
    expect(checkout).not.toMatch(/platform_fee.*\* 0\.0[12]/);
    expect(checkout).not.toMatch(/0\.02 \* 100/);
  });

  it('checkout imports StoreBillingSettingsService and uses WalletPostingService.postPlatformFee (TASK-0034 sub-item 5)', () => {
    // After TASK-0034 sub-item 5, the raw calcPlatformFee call moved
    // into WalletPostingService.postPlatformFee. checkout.ts no longer
    // imports calcPlatformFee directly — it goes through the service.
    // The policy is still read from StoreBillingSettingsService, but
    // the fee calculation is owned by the service.
    const checkout = read('packages/commerce-core/src/checkout.ts');
    expect(checkout).toContain('StoreBillingSettingsService');
    expect(checkout).toContain('txPosting.postPlatformFee');
    // Should NOT import calcPlatformFee directly anymore
    expect(checkout).not.toMatch(/import\s*\{[^}]*calcPlatformFee[^}]*\}\s*from\s*['"]@haa\/wallet-core['"]/);
  });

  it('checkout records the fee-snapshot fields (feeRatePct, feeFixed, feeSource)', () => {
    const checkout = read('packages/commerce-core/src/checkout.ts');
    expect(checkout).toContain('feeRatePct:');
    expect(checkout).toContain('feeFixed:');
    expect(checkout).toContain("feeSource: 'platform_policy'");
  });

  it('checkout reads the policy inside the transaction so the snapshot is consistent', () => {
    const checkout = read('packages/commerce-core/src/checkout.ts');
    expect(checkout).toContain('txBilling.getPlatformFeePolicy(storeId)');
  });

  it('webhook payment-success path also reads the policy via the service (not hardcoded, not raw calcPlatformFee)', () => {
    // As of QP5 Route Migration 18/24, the webhook route
    // is a thin transport shell. The platform-fee logic
    // lives in PaymentWebhookService (commerce-core). The
    // wiring guarantee (TASK-0030) is preserved if the
    // service reads the policy + uses the posting service,
    // not hardcoded constants.
    // After TASK-0034 sub-item 5, calcPlatformFee is no
    // longer called directly in this file — the
    // WalletPostingService.postPlatformFee owns the
    // calculation. So we assert the service is used and
    // the raw calcPlatformFee import is gone.
    const svc = read('packages/commerce-core/src/payment-webhook-service.ts');
    expect(svc).toContain('StoreBillingSettingsService');
    expect(svc).toContain('txPosting.postPlatformFee');
    expect(svc).not.toMatch(/import\s*\{[^}]*calcPlatformFee[^}]*\}\s*from\s*['"]@haa\/wallet-core['"]/);
    expect(svc).not.toMatch(/0\.02 \* 100/);
  });
});

describe('Wallet summary exposes structured fees', () => {
  it('getSummary returns a `fees` block with platform, paymentProcessing, total', () => {
    const ledger = read('packages/wallet-core/src/ledger.ts');
    expect(ledger).toContain('fees:');
    expect(ledger).toContain('platform:');
    expect(ledger).toContain('paymentProcessing:');
    expect(ledger).toContain('total:');
  });

  it('merchant wallet summary endpoint includes platformFee policy surface', () => {
    const walletRoute = read('apps/api/src/routes/wallet.ts');
    expect(walletRoute).toContain('StoreBillingSettingsService');
    expect(walletRoute).toContain('platformFee:');
    expect(walletRoute).toContain('describePlatformFeePolicy');
  });
});

describe('Admin API endpoints', () => {
  it('GET and PATCH /admin/stores/:storeId/billing-settings are mounted', () => {
    const adminIdx = read('apps/api/src/routes/admin/index.ts');
    // The actual file splits the call across multiple lines, so we look
    // for the path string and the adminRouter.get/patch calls separately.
    expect(adminIdx).toContain("'/stores/:storeId/billing-settings'");
    expect(adminIdx).toMatch(/adminRouter\.get\(\s*'\/stores\/:storeId\/billing-settings'/);
    expect(adminIdx).toMatch(/adminRouter\.patch\(\s*'\/stores\/:storeId\/billing-settings'/);
  });

  it('admin route is gated by requireAdminAuth() and requireAdminPermission', () => {
    const adminIdx = read('apps/api/src/routes/admin/index.ts');
    expect(adminIdx).toContain("requireAdminPermission('billing.platform_fee.read'");
    expect(adminIdx).toContain("requireAdminPermission('billing.platform_fee.update'");
  });

  it('admin route file uses validatePlatformFeePolicyInput and Zod', () => {
    const route = read('apps/api/src/routes/admin/billing-settings.ts');
    expect(route).toContain('validatePlatformFeePolicyInput');
    // Route validates via a Zod schema (updateSchema = z.object({...})), not the
    // @hono/zod-validator middleware — assert the real Zod usage rather than the
    // unused `zValidator` import that previously satisfied this check by accident.
    expect(route).toContain('z.object');
    expect(route).toContain('changeReason');
  });

  it('admin Api surface exposes getStoreBillingSettings + updateStoreBillingSettings', () => {
    const api = read('apps/admin-dashboard/src/lib/api.ts');
    expect(api).toContain('getStoreBillingSettings');
    expect(api).toContain('updateStoreBillingSettings');
  });
});

describe('Admin dashboard page', () => {
  it('StoreBillingSettings.tsx exists', () => {
    expect(existsSync(resolve(ROOT, 'apps/admin-dashboard/src/pages/StoreBillingSettings.tsx'))).toBe(true);
  });
  it('App.tsx mounts the new page and adds a nav entry', () => {
    const app = read('apps/admin-dashboard/src/App.tsx');
    expect(app).toContain('StoreBillingSettings');
    expect(app).toContain('/store-billing|رسوم المتاجر|CreditCard');
    expect(app).toContain('path="/store-billing"');
  });
});

describe('Merchant dashboard — read-only policy surface', () => {
  it('Wallet.tsx renders a platformFee policy card (read-only)', () => {
    const wallet = read('apps/merchant-dashboard/src/pages/Wallet.tsx');
    expect(wallet).toContain('summary?.platformFee');
    expect(wallet).toContain('platformFeePolicyTitle');
    expect(wallet).toContain('platformFeePolicyDescription');
  });
});

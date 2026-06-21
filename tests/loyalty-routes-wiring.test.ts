import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const route = readFileSync(new URL('../apps/api/src/routes/loyalty.ts', import.meta.url), 'utf-8');
const index = readFileSync(new URL('../apps/api/src/index.ts', import.meta.url), 'utf-8');
const webhook = readFileSync(new URL('../packages/commerce-core/src/payment-webhook-service.ts', import.meta.url), 'utf-8');
const orders = readFileSync(new URL('../packages/commerce-core/src/orders.ts', import.meta.url), 'utf-8');

describe('loyalty API routes (QA Loyalty)', () => {
  it('exposes settings GET/PUT and customer balance', () => {
    expect(route).toContain("'/settings'");
    expect(route).toContain("'/customers/:customerId'");
    expect(route).toContain("requirePermission('promotions:read')");
    expect(route).toContain("requirePermission('promotions:update')");
  });

  it('validates settings input bounds (maxRedeemPercent 0..1)', () => {
    expect(route).toContain('maxRedeemPercent: z.number().min(0).max(1)');
  });

  it('is mounted under the merchant store path', () => {
    expect(index).toContain("app.route('/merchant/:storeId/loyalty', loyaltyRouter)");
  });
});

describe('loyalty earn wiring (QA Loyalty)', () => {
  it('online payments earn after the payment transaction commits (best-effort)', () => {
    expect(webhook).toContain('awardLoyaltyForOrder');
    expect(webhook).toContain('becamePaid');
    expect(webhook).toContain('earnFromOrder');
    // must not throw into the payment flow
    expect(webhook).toMatch(/awardLoyaltyForOrder\([^)]*\)\.catch/);
  });

  it('COD collection earns after the transaction, best-effort', () => {
    expect(orders).toContain('earnFromOrder');
    expect(orders).toMatch(/earnFromOrder\([\s\S]*?\)\.catch/);
  });
});

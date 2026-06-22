import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

/**
 * L-PR-2 verification — source-grep over apps/api/src/routes/loyalty.ts
 * proving the new earn / redeem / transactions routes are registered
 * with the right RBAC, validation, idempotency middleware, and typed
 * error codes. Companion to loyalty-routes-wiring.test.ts which
 * locked the original 4 routes (settings + customers + expire).
 *
 * Uses the same source-grep pattern as the rest of the loyalty suite
 * (loyalty-routes-wiring.test.ts, loyalty-service.test.ts,
 * loyalty-schema.test.ts) so the test runs without a database and is
 * stable across CI environments.
 */

const route = readFileSync(new URL('../apps/api/src/routes/loyalty.ts', import.meta.url), 'utf-8');
const svc = readFileSync(new URL('../packages/commerce-core/src/loyalty.ts', import.meta.url), 'utf-8');

describe('loyalty routes — L-PR-2 manual earn (POST /customers/:customerId/earn)', () => {
  it('is registered under the customer path with promotions:update RBAC', () => {
    expect(route).toMatch(/loyaltyRouter\.post\(\s*['"]\/customers\/:customerId\/earn['"]/);
    expect(route).toMatch(/['"]\/customers\/:customerId\/earn['"][\s\S]{0,400}requirePermission\(['"]promotions:update['"]\)/);
  });

  it('requires Idempotency-Key (idempotencyKey middleware) on the POST', () => {
    expect(route).toMatch(/['"]\/customers\/:customerId\/earn['"][\s\S]{0,500}idempotencyKey\(\)/);
    expect(route).toContain("import { idempotencyKey } from '../middleware/idempotency-key.js'");
  });

  it('validates body via zod (points int positive + reason non-empty)', () => {
    expect(route).toContain('earnSchema');
    expect(route).toMatch(/points:\s*z\.number\(\)\.int\(\)\.positive\(\)/);
    expect(route).toMatch(/reason:\s*z\.number\(\)|reason:\s*z\.string\(\)\.min\(1\)/);
  });

  it('returns the typed RULES_DISABLED error code when loyalty is off', () => {
    expect(route).toContain("'RULES_DISABLED'");
  });
});

describe('loyalty routes — L-PR-2 manual redeem (POST /customers/:customerId/redeem)', () => {
  it('is registered with promotions:update RBAC + idempotency key', () => {
    expect(route).toMatch(/loyaltyRouter\.post\(\s*['"]\/customers\/:customerId\/redeem['"]/);
    expect(route).toMatch(/['"]\/customers\/:customerId\/redeem['"][\s\S]{0,500}requirePermission\(['"]promotions:update['"]\)[\s\S]{0,200}idempotencyKey\(\)/);
  });

  it('validates body via zod (points int positive)', () => {
    expect(route).toContain('redeemSchema');
    expect(route).toMatch(/redeemSchema[\s\S]{0,200}points:\s*z\.number\(\)\.int\(\)\.positive\(\)/);
  });

  it('returns typed error codes for the documented failure modes', () => {
    expect(route).toContain("'INSUFFICIENT_BALANCE'");
    expect(route).toContain("'BELOW_MIN_REDEEM'");
    expect(route).toContain("'NO_REDEEMABLE_VALUE'");
  });

  it('delegates to LoyaltyService.redeem (single source of truth for math)', () => {
    expect(route).toMatch(/svc\.redeem\(/);
  });
});

describe('loyalty routes — L-PR-2 ledger (GET /customers/:customerId/transactions)', () => {
  it('is registered with promotions:read RBAC', () => {
    expect(route).toMatch(/loyaltyRouter\.get\(\s*['"]\/customers\/:customerId\/transactions['"]/);
    expect(route).toMatch(/['"]\/customers\/:customerId\/transactions['"][\s\S]{0,400}requirePermission\(['"]promotions:read['"]\)/);
  });

  it('accepts cursor + limit query (cursor pagination)', () => {
    expect(route).toContain('transactionsQuerySchema');
    expect(route).toMatch(/cursor:\s*z\.coerce\.number\(\)\.int\(\)\.positive\(\)/);
    expect(route).toMatch(/limit:\s*z\.coerce\.number\(\)\.int\(\)\.min\(1\)\.max\(100\)/);
  });

  it('delegates to LoyaltyService.listTransactionsPaginated (returns nextCursor)', () => {
    expect(route).toContain('listTransactionsPaginated');
    expect(svc).toContain('async listTransactionsPaginated');
    expect(svc).toContain('nextCursor');
  });
});

describe('loyalty service — manual adjust + paginated ledger (L-PR-2 backing)', () => {
  it('LoyaltyService.adjustPoints credits the account and writes type=adjust', () => {
    expect(svc).toContain('async adjustPoints');
    // The function MUST insert with type: 'adjust' and direction: 'credit'.
    expect(svc).toMatch(/type:\s*'adjust'[\s\S]{0,300}direction:\s*'credit'/);
  });

  it('adjustPoints refuses when rules are disabled (typed reason)', () => {
    expect(svc).toContain("reason: 'rules_disabled'");
  });

  it('adjustPoints clamps non-positive / non-integer points (typed reason)', () => {
    expect(svc).toContain("reason: 'invalid_points'");
  });

  it('listTransactionsPaginated uses keyset (cursor on id, desc) — stable across inserts', () => {
    expect(svc).toMatch(/lt\(s\.loyaltyTransactions\.id,\s*opts\.cursor\)/);
    expect(svc).toMatch(/orderBy\(desc\(s\.loyaltyTransactions\.id\)\)/);
  });

  it('listTransactionsPaginated caps limit at 100 (overpull-by-one for nextCursor)', () => {
    expect(svc).toMatch(/Math\.min\(Math\.max\(1,\s*opts\.limit\s*\?\?\s*50\),\s*100\)/);
    expect(svc).toMatch(/limit\(limit\s*\+\s*1\)/);
  });
});

describe('loyalty earn idempotency — L-PR-1 contract', () => {
  it('LoyaltyService.earnFromOrder relies on the partial unique index (DB-level)', () => {
    // The earn path checks for an existing earn-on-order row (fast path) AND
    // catches the unique violation (race path). Both rely on the partial
    // unique index loyalty_tx_earn_order_uniq from 0071_loyalty.sql.
    expect(svc).toContain("eq(s.loyaltyTransactions.type, 'earn')");
    expect(svc).toContain("eq(s.loyaltyTransactions.referenceType, 'order')");
    expect(svc).toContain('isUniqueViolation(err)');
  });

  it('returns { duplicate: true } when re-invoked for the same order', () => {
    expect(svc).toMatch(/return\s*\{\s*earned:\s*0,\s*duplicate:\s*true\s*\}/);
  });

  it('order-completion paths call earnFromOrder best-effort (never blocks payment)', () => {
    const webhook = readFileSync(
      new URL('../packages/commerce-core/src/payment-webhook-service.ts', import.meta.url),
      'utf-8',
    );
    const orders = readFileSync(
      new URL('../packages/commerce-core/src/orders.ts', import.meta.url),
      'utf-8',
    );
    // Online payments — webhook fires earnFromOrder after the tx commits.
    expect(webhook).toMatch(/awardLoyaltyForOrder\([^)]*\)\.catch/);
    // COD collection — orders.collectCOD fires earnFromOrder after the tx commits.
    expect(orders).toMatch(/earnFromOrder\([\s\S]*?\)\.catch/);
  });
});

// HAA-ORDER-STATE-HARDENING — Payment + fulfillment transition tables.
//
// Two layers of coverage:
//
//   1. Static guards on the new transition maps in
//      `@haa/shared/constants` — every union member of
//      `PaymentStatus` / `FulfillmentStatus` must appear as a key.
//
//   2. Source-grep guards on `OrdersService` so the wire points
//      cannot regress silently. We assert that:
//        - `updatePaymentStatus` references `PAYMENT_STATUS_TRANSITIONS`
//          and writes `payment:<from>` / `payment:<to>` history rows.
//        - `updateFulfillmentStatus` references `FULFILLMENT_STATUS_TRANSITIONS`.
//        - `changeStatus` performs its row read INSIDE the transaction
//          (closes the validate-then-write window).
//
// We use the same source-grep pattern already established in
// `route-migration-1-auth.test.ts` — no DB, no mocks, just
// invariants on the constants file + service file.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  PAYMENT_STATUS_TRANSITIONS,
  FULFILLMENT_STATUS_TRANSITIONS,
  ORDER_STATUS_TRANSITIONS,
} from '@haa/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const ordersServiceFile = resolve(projectRoot, 'packages/commerce-core/src/orders.ts');
const sharedConstantsFile = resolve(projectRoot, 'packages/shared/src/constants/index.ts');

function read(p: string): string {
  return readFileSync(p, 'utf-8');
}

// Source of truth for which states the table MUST contain. We hard-code
// them rather than re-importing the type (types are erased at runtime)
// so a future union extension forces an explicit decision here.
const PAYMENT_STATUS_VALUES = [
  'unpaid',
  'pending',
  'requires_3ds',
  'authorized',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
  'expired',
] as const;

const FULFILLMENT_STATUS_VALUES = [
  'unfulfilled',
  'partially_fulfilled',
  'fulfilled',
] as const;

describe('PAYMENT_STATUS_TRANSITIONS — coverage', () => {
  for (const value of PAYMENT_STATUS_VALUES) {
    it(`includes '${value}' as a key`, () => {
      expect(PAYMENT_STATUS_TRANSITIONS).toHaveProperty(value);
      expect(Array.isArray(PAYMENT_STATUS_TRANSITIONS[value])).toBe(true);
    });
  }

  it('canonical edges from the hardening spec are present', () => {
    expect(PAYMENT_STATUS_TRANSITIONS.unpaid).toEqual(
      expect.arrayContaining(['paid', 'failed', 'cancelled']),
    );
    expect(PAYMENT_STATUS_TRANSITIONS.authorized).toEqual(
      expect.arrayContaining(['paid', 'failed', 'cancelled']),
    );
    expect(PAYMENT_STATUS_TRANSITIONS.paid).toEqual(
      expect.arrayContaining(['refunded', 'partially_refunded']),
    );
    expect(PAYMENT_STATUS_TRANSITIONS.partially_refunded).toEqual(['refunded']);
    expect(PAYMENT_STATUS_TRANSITIONS.refunded).toEqual([]);
    expect(PAYMENT_STATUS_TRANSITIONS.failed).toEqual(
      expect.arrayContaining(['unpaid', 'cancelled']),
    );
    expect(PAYMENT_STATUS_TRANSITIONS.cancelled).toEqual([]);
  });

  it('refunded + cancelled are terminal', () => {
    expect(PAYMENT_STATUS_TRANSITIONS.refunded).toEqual([]);
    expect(PAYMENT_STATUS_TRANSITIONS.cancelled).toEqual([]);
  });
});

describe('FULFILLMENT_STATUS_TRANSITIONS — coverage', () => {
  for (const value of FULFILLMENT_STATUS_VALUES) {
    it(`includes '${value}' as a key`, () => {
      expect(FULFILLMENT_STATUS_TRANSITIONS).toHaveProperty(value);
      expect(Array.isArray(FULFILLMENT_STATUS_TRANSITIONS[value])).toBe(true);
    });
  }

  it('forward-only progression', () => {
    expect(FULFILLMENT_STATUS_TRANSITIONS.unfulfilled).toEqual(
      expect.arrayContaining(['partially_fulfilled', 'fulfilled']),
    );
    expect(FULFILLMENT_STATUS_TRANSITIONS.partially_fulfilled).toEqual(
      expect.arrayContaining(['fulfilled']),
    );
    expect(FULFILLMENT_STATUS_TRANSITIONS.fulfilled).toEqual([]);
  });

  it('rejects backward / illegal transitions', () => {
    expect(FULFILLMENT_STATUS_TRANSITIONS.fulfilled).not.toContain('unfulfilled');
    expect(FULFILLMENT_STATUS_TRANSITIONS.partially_fulfilled).not.toContain('unfulfilled');
  });
});

describe('shared/constants — both tables are exported', () => {
  it('both new constants are exported from the constants module', () => {
    const content = read(sharedConstantsFile);
    expect(content).toMatch(/export\s+const\s+PAYMENT_STATUS_TRANSITIONS\b/);
    expect(content).toMatch(/export\s+const\s+FULFILLMENT_STATUS_TRANSITIONS\b/);
  });

  it('ORDER_STATUS_TRANSITIONS still exists (no regression)', () => {
    expect(ORDER_STATUS_TRANSITIONS).toHaveProperty('draft');
    expect(ORDER_STATUS_TRANSITIONS).toHaveProperty('cancelled');
  });
});

describe('OrdersService — source-grep wire-up guards', () => {
  const src = read(ordersServiceFile);

  it('imports the new transition tables from @haa/shared', () => {
    expect(src).toMatch(/PAYMENT_STATUS_TRANSITIONS/);
    expect(src).toMatch(/FULFILLMENT_STATUS_TRANSITIONS/);
  });

  it('updatePaymentStatus references PAYMENT_STATUS_TRANSITIONS', () => {
    // Slice the method body so we don't accidentally match on the
    // import line.
    const start = src.indexOf('async updatePaymentStatus(');
    expect(start).toBeGreaterThan(-1);
    const next = src.indexOf('\n  async ', start + 1);
    const body = src.slice(start, next === -1 ? src.length : next);
    expect(body).toMatch(/PAYMENT_STATUS_TRANSITIONS/);
  });

  it('updatePaymentStatus history row uses `payment:` prefix for BOTH from + to', () => {
    const start = src.indexOf('async updatePaymentStatus(');
    const next = src.indexOf('\n  async ', start + 1);
    const body = src.slice(start, next === -1 ? src.length : next);
    expect(body).toMatch(/fromStatus:\s*`payment:\$\{[^}]+\}`/);
    expect(body).toMatch(/toStatus:\s*`payment:\$\{[^}]+\}`/);
    // The old "fromStatus: undefined" sentinel must be gone.
    expect(body).not.toMatch(/fromStatus:\s*undefined/);
  });

  it('updateFulfillmentStatus references FULFILLMENT_STATUS_TRANSITIONS', () => {
    const start = src.indexOf('async updateFulfillmentStatus(');
    expect(start).toBeGreaterThan(-1);
    const next = src.indexOf('\n  async ', start + 1);
    const body = src.slice(start, next === -1 ? src.length : next);
    expect(body).toMatch(/FULFILLMENT_STATUS_TRANSITIONS/);
  });

  it('updateFulfillmentStatus writes a `fulfillment:` history row', () => {
    const start = src.indexOf('async updateFulfillmentStatus(');
    const next = src.indexOf('\n  async ', start + 1);
    const body = src.slice(start, next === -1 ? src.length : next);
    expect(body).toMatch(/fromStatus:\s*`fulfillment:\$\{[^}]+\}`/);
    expect(body).toMatch(/toStatus:\s*`fulfillment:\$\{[^}]+\}`/);
  });

  it('updateFulfillmentStatus is wrapped in a transaction', () => {
    const start = src.indexOf('async updateFulfillmentStatus(');
    const next = src.indexOf('\n  async ', start + 1);
    const body = src.slice(start, next === -1 ? src.length : next);
    expect(body).toMatch(/this\.db\.transaction\(async\s*\(tx\)/);
  });

  it('changeStatus reads the order INSIDE the transaction (no TOCTOU window)', () => {
    const start = src.indexOf('async changeStatus(');
    expect(start).toBeGreaterThan(-1);
    const next = src.indexOf('\n  async ', start + 1);
    const body = src.slice(start, next === -1 ? src.length : next);

    const txStart = body.indexOf('this.db.transaction(async (tx)');
    expect(txStart).toBeGreaterThan(-1);

    const updateAt = body.indexOf('tx.update(s.orders)', txStart);
    expect(updateAt).toBeGreaterThan(-1);

    const between = body.slice(txStart, updateAt);
    // The read must appear between the transaction opening and the write.
    expect(between).toMatch(/tx\.select\(/);
  });

  it('changeStatus has an idempotent same-status fast path', () => {
    const start = src.indexOf('async changeStatus(');
    const next = src.indexOf('\n  async ', start + 1);
    const body = src.slice(start, next === -1 ? src.length : next);
    // We look for "newStatus === order.status" as the discriminator.
    expect(body).toMatch(/newStatus\s*===\s*order\.status/);
  });

  it('updatePaymentStatus has an idempotent same-status fast path', () => {
    const start = src.indexOf('async updatePaymentStatus(');
    const next = src.indexOf('\n  async ', start + 1);
    const body = src.slice(start, next === -1 ? src.length : next);
    expect(body).toMatch(/paymentStatus\s*===\s*previous\.paymentStatus/);
  });
});

describe('OrdersService — smoke transitions via PAYMENT_STATUS_TRANSITIONS', () => {
  it('unpaid → paid is allowed', () => {
    expect(PAYMENT_STATUS_TRANSITIONS.unpaid).toContain('paid');
  });

  it('paid → unpaid is REJECTED', () => {
    expect(PAYMENT_STATUS_TRANSITIONS.paid).not.toContain('unpaid');
  });

  it('refunded → anything is REJECTED (terminal)', () => {
    expect(PAYMENT_STATUS_TRANSITIONS.refunded).toEqual([]);
  });

  it('paid → refunded is allowed', () => {
    expect(PAYMENT_STATUS_TRANSITIONS.paid).toContain('refunded');
  });

  it('paid → partially_refunded is allowed', () => {
    expect(PAYMENT_STATUS_TRANSITIONS.paid).toContain('partially_refunded');
  });

  it('partially_refunded → refunded is allowed (escalate refund)', () => {
    expect(PAYMENT_STATUS_TRANSITIONS.partially_refunded).toContain('refunded');
  });
});

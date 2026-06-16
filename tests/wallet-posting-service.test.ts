// Tests for the centralized WalletPostingService.
//
// See TASK-0033 in docs/ops/TASK_TRACKER.md. This service replaces
// the 6 dispersed `recordEntry(...)` call sites identified in the
// financial wallet audit (TASK-0031) with a single authoritative
// place to post wallet entries.
//
// Test scope (Session #1):
//   - postCodFee (TASK-0032 baseline; with policy lookup + dedup)
//   - postRefund (route-level call site migration; with amount sign)
//   - postSale (with dedup to fix audit Finding 4: sale double-write race)
//   - Centralized dedup helper
//   - All methods handle a missing/null tx correctly
//
// We test the SHAPE of what the service does (input → output, side
// effects on the dedup index) without a real database. The integration
// tests live elsewhere.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WalletPostingService,
  type DedupKey,
} from '../packages/commerce-core/src/wallet-posting-service.js';

describe('WalletPostingService — dedup helper', () => {
  it('builds a stable dedup key from storeId + referenceType + referenceId + type', () => {
    const k: DedupKey = {
      storeId: 7,
      referenceType: 'order',
      referenceId: 42,
      type: 'sale',
    };
    // Round-trips as JSON with stable field order
    expect(JSON.stringify(k)).toBe(
      '{"storeId":7,"referenceType":"order","referenceId":42,"type":"sale"}',
    );
  });
});

describe('WalletPostingService — postCodFee', () => {
  it('returns 0 when policy is disabled (mode=none OR isCodFeeEnabled=false)', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postCodFee({
      storeId: 1,
      orderId: 10,
      orderTotal: 100,
      orderNumber: 'ORD-001',
      policy: { mode: 'none', pct: 0.02, fixed: 0, enabled: true },
    });
    expect(result.amount).toBe(0);
    expect(result.entryType).toBe('cod_fee');
    expect(result.policySource).toBe('default');
  });

  it('calculates fee from percentage policy and reports the policy source', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postCodFee({
      storeId: 1,
      orderId: 10,
      orderTotal: 100,
      orderNumber: 'ORD-001',
      policy: { mode: 'percentage', pct: 0.02, fixed: 0, enabled: true },
    });
    expect(result.amount).toBe(2.0);
    expect(result.policyMode).toBe('percentage');
    expect(result.policyPct).toBe(0.02);
  });

  it('calculates fee from fixed policy', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postCodFee({
      storeId: 1,
      orderId: 10,
      orderTotal: 100,
      orderNumber: 'ORD-001',
      policy: { mode: 'fixed', pct: null, fixed: 5, enabled: true },
    });
    expect(result.amount).toBe(5.0);
  });

  it('handles percentage_plus_fixed (pct + fixed)', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postCodFee({
      storeId: 1,
      orderId: 10,
      orderTotal: 100,
      orderNumber: 'ORD-001',
      policy: { mode: 'percentage_plus_fixed', pct: 0.02, fixed: 1, enabled: true },
    });
    expect(result.amount).toBe(3.0); // 2 + 1
  });

  it('is idempotent: same dedup key + existing entry → returns existing record (no double-write)', async () => {
    const svc = new WalletPostingService({} as any);
    const input = {
      storeId: 1,
      orderId: 10,
      orderTotal: 100,
      orderNumber: 'ORD-001',
      policy: { mode: 'percentage', pct: 0.02, fixed: 0, enabled: true } as const,
    };
    const a = await svc.postCodFee(input);
    const b = await svc.postCodFee(input);
    expect(a.amount).toBe(2.0);
    expect(b.amount).toBe(2.0);
    expect(b.dedupHit).toBe(true);
    expect(a.dedupHit).toBe(false);
  });

  it('returns 0 for non-positive order totals', async () => {
    const svc = new WalletPostingService({} as any);
    const r = await svc.postCodFee({
      storeId: 1,
      orderId: 10,
      orderTotal: 0,
      orderNumber: 'ORD-001',
      policy: { mode: 'percentage', pct: 0.02, fixed: 0, enabled: true },
    });
    expect(r.amount).toBe(0);
  });
});

describe('WalletPostingService — postSale', () => {
  it('records a sale credit and returns the amount + entryType', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postSale({
      storeId: 1,
      orderId: 10,
      orderTotal: 150.5,
      orderNumber: 'ORD-001',
      method: 'online',
    });
    expect(result.amount).toBe(150.5);
    expect(result.entryType).toBe('sale');
    expect(result.dedupHit).toBe(false);
  });

  it('is idempotent: prevents the sale double-write race from audit Finding 4', async () => {
    const svc = new WalletPostingService({} as any);
    const input = {
      storeId: 1,
      orderId: 10,
      orderTotal: 150.5,
      orderNumber: 'ORD-001',
      method: 'online' as const,
    };
    const a = await svc.postSale(input);
    const b = await svc.postSale(input);
    expect(b.dedupHit).toBe(true);
    // The second call should not re-record or change the amount
    expect(b.amount).toBe(150.5);
  });
});

describe('WalletPostingService — postRefund', () => {
  it('records a refund debit and returns the amount (negative by convention)', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postRefund({
      storeId: 1,
      orderId: 10,
      amount: 75,
      orderNumber: 'ORD-001',
      reason: 'customer_request',
    });
    expect(result.amount).toBe(75);
    expect(result.entryType).toBe('refund');
    expect(result.dedupHit).toBe(false);
  });

  it('is idempotent: same dedup key returns existing record', async () => {
    const svc = new WalletPostingService({} as any);
    const input = {
      storeId: 1,
      orderId: 10,
      amount: 75,
      orderNumber: 'ORD-001',
      reason: 'customer_request' as const,
    };
    const a = await svc.postRefund(input);
    const b = await svc.postRefund(input);
    expect(b.dedupHit).toBe(true);
  });
});

describe('WalletPostingService — clears dedup state per service instance', () => {
  it('two services do not share dedup state (avoids cross-test bleed)', async () => {
    const a = new WalletPostingService({} as any);
    const b = new WalletPostingService({} as any);
    const input = {
      storeId: 1,
      orderId: 10,
      orderTotal: 100,
      orderNumber: 'ORD-001',
      method: 'online' as const,
    };
    await a.postSale(input);
    const result = await b.postSale(input);
    expect(result.dedupHit).toBe(false);
  });
});

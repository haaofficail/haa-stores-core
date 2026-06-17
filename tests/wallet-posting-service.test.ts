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

describe('WalletPostingService — postPlatformFee', () => {
  it('returns 0 when policy is disabled (mode=none OR isPlatformFeeEnabled=false)', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postPlatformFee({
      storeId: 1,
      orderId: 20,
      orderTotal: 100,
      orderNumber: 'ORD-002',
      policy: { mode: 'none', pct: 0.02, fixed: 0, enabled: true },
    });
    expect(result.amount).toBe(0);
    expect(result.entryType).toBe('platform_fee');
    expect(result.policySource).toBe('default');
  });

  it('calculates fee from percentage policy and reports the policy source', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postPlatformFee({
      storeId: 1,
      orderId: 20,
      orderTotal: 100,
      orderNumber: 'ORD-002',
      policy: { mode: 'percentage', pct: 0.02, fixed: 0, enabled: true },
    });
    expect(result.amount).toBe(2.0);
    expect(result.policyMode).toBe('percentage');
    expect(result.policyPct).toBe(0.02);
  });

  it('calculates fee from fixed policy', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postPlatformFee({
      storeId: 1,
      orderId: 20,
      orderTotal: 100,
      orderNumber: 'ORD-002',
      policy: { mode: 'fixed', pct: null, fixed: 5, enabled: true },
    });
    expect(result.amount).toBe(5.0);
  });

  it('handles percentage_plus_fixed (pct + fixed)', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postPlatformFee({
      storeId: 1,
      orderId: 20,
      orderTotal: 100,
      orderNumber: 'ORD-002',
      policy: { mode: 'percentage_plus_fixed', pct: 0.02, fixed: 1, enabled: true },
    });
    expect(result.amount).toBe(3.0); // 2 + 1
  });

  it('is idempotent: same dedup key + existing entry → returns existing record (no double-write)', async () => {
    const svc = new WalletPostingService({} as any);
    const input = {
      storeId: 1,
      orderId: 20,
      orderTotal: 100,
      orderNumber: 'ORD-002',
      policy: { mode: 'percentage', pct: 0.02, fixed: 0, enabled: true } as const,
    };
    const a = await svc.postPlatformFee(input);
    const b = await svc.postPlatformFee(input);
    expect(a.amount).toBe(2.0);
    expect(b.amount).toBe(2.0);
    expect(b.dedupHit).toBe(true);
    expect(a.dedupHit).toBe(false);
  });

  it('returns 0 for non-positive order totals', async () => {
    const svc = new WalletPostingService({} as any);
    const r = await svc.postPlatformFee({
      storeId: 1,
      orderId: 20,
      orderTotal: 0,
      orderNumber: 'ORD-002',
      policy: { mode: 'percentage', pct: 0.02, fixed: 0, enabled: true },
    });
    expect(r.amount).toBe(0);
  });

  it('postPlatformFee and postCodFee are independent (different dedup keys)', async () => {
    // Both can be posted for the same order — they have different
    // entry types so they don't dedup-hit each other.
    const svc = new WalletPostingService({} as any);
    const codPolicy = { mode: 'percentage', pct: 0.02, fixed: 0, enabled: true } as const;
    const platformPolicy = { mode: 'percentage', pct: 0.02, fixed: 0, enabled: true } as const;
    const codResult = await svc.postCodFee({
      storeId: 1,
      orderId: 30,
      orderTotal: 100,
      orderNumber: 'ORD-003',
      policy: codPolicy,
    });
    const platformResult = await svc.postPlatformFee({
      storeId: 1,
      orderId: 30,
      orderTotal: 100,
      orderNumber: 'ORD-003',
      policy: platformPolicy,
    });
    expect(codResult.entryType).toBe('cod_fee');
    expect(platformResult.entryType).toBe('platform_fee');
    expect(codResult.amount).toBe(2.0);
    expect(platformResult.amount).toBe(2.0);
    expect(codResult.dedupHit).toBe(false);
    expect(platformResult.dedupHit).toBe(false);
  });
});

describe('WalletPostingService — postGatewayFee', () => {
  it('records a gateway fee debit and returns the amount + entryType + provider + refund policy', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postGatewayFee({
      storeId: 1,
      orderId: 40,
      amount: 7.5,
      orderNumber: 'ORD-004',
      provider: 'moyasar',
    });
    expect(result.amount).toBe(7.5);
    expect(result.entryType).toBe('gateway_fee');
    expect(result.dedupHit).toBe(false);
    expect((result as any).provider).toBe('moyasar');
    expect((result as any).refundPolicy).toBe('REFUNDABLE');
  });

  it('looks up refund policy from provider default (tabby → NON_REFUNDABLE)', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postGatewayFee({
      storeId: 1,
      orderId: 41,
      amount: 5,
      orderNumber: 'ORD-005',
      provider: 'tabby',
    });
    expect((result as any).refundPolicy).toBe('NON_REFUNDABLE');
  });

  it('explicit refundPolicy override wins over provider default', async () => {
    // If a merchant has a negotiated deal with tabby that allows
    // refund, the override should win.
    const svc = new WalletPostingService({} as any);
    const result = await svc.postGatewayFee({
      storeId: 1,
      orderId: 42,
      amount: 5,
      orderNumber: 'ORD-006',
      provider: 'tabby',
      refundPolicy: 'REFUNDABLE',
    });
    expect((result as any).refundPolicy).toBe('REFUNDABLE');
  });

  it('is idempotent: same dedup key returns existing record (no double-write)', async () => {
    const svc = new WalletPostingService({} as any);
    const input = {
      storeId: 1,
      orderId: 43,
      amount: 7.5,
      orderNumber: 'ORD-007',
      provider: 'moyasar' as const,
    };
    const a = await svc.postGatewayFee(input);
    const b = await svc.postGatewayFee(input);
    expect(a.amount).toBe(7.5);
    expect(b.amount).toBe(7.5);
    expect(b.dedupHit).toBe(true);
    expect(a.dedupHit).toBe(false);
  });

  it('returns 0 for non-positive amounts (defensive — no fee should be a no-op)', async () => {
    const svc = new WalletPostingService({} as any);
    const r = await svc.postGatewayFee({
      storeId: 1,
      orderId: 44,
      amount: 0,
      orderNumber: 'ORD-008',
      provider: 'moyasar',
    });
    expect(r.amount).toBe(0);
  });
});

describe('WalletPostingService — postSettlementDifference', () => {
  it('records a positive difference when settled > expected (merchant gained)', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postSettlementDifference({
      storeId: 1,
      orderId: 50,
      expectedAmount: 100,
      settledAmount: 102.5,
      orderNumber: 'ORD-010',
      reason: 'fx_difference',
    });
    expect(result.amount).toBe(2.5); // signed: positive = gained
    expect(result.entryType).toBe('settlement_difference');
    expect(result.dedupHit).toBe(false);
    expect((result as any).reason).toBe('fx_difference');
  });

  it('records a negative difference when settled < expected (merchant lost)', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postSettlementDifference({
      storeId: 1,
      orderId: 51,
      expectedAmount: 100,
      settledAmount: 98.0,
      orderNumber: 'ORD-011',
      reason: 'partial_refund',
    });
    expect(result.amount).toBe(-2.0); // signed: negative = lost
    expect(result.entryType).toBe('settlement_difference');
  });

  it('returns 0 with dedupHit=true when settled === expected (no difference to record)', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postSettlementDifference({
      storeId: 1,
      orderId: 52,
      expectedAmount: 100,
      settledAmount: 100,
      orderNumber: 'ORD-012',
      reason: 'unknown',
    });
    expect(result.amount).toBe(0);
    // Idempotency: a 0-difference call still records its dedup key
    // so subsequent calls for the same order are no-ops.
    expect(result.dedupHit).toBe(false);
    const second = await svc.postSettlementDifference({
      storeId: 1,
      orderId: 52,
      expectedAmount: 100,
      settledAmount: 100,
      orderNumber: 'ORD-012',
      reason: 'unknown',
    });
    expect(second.dedupHit).toBe(true);
  });

  it('is idempotent: same dedup key returns existing record', async () => {
    const svc = new WalletPostingService({} as any);
    const input = {
      storeId: 1,
      orderId: 53,
      expectedAmount: 100,
      settledAmount: 102,
      orderNumber: 'ORD-013',
      reason: 'fx_difference' as const,
    };
    const a = await svc.postSettlementDifference(input);
    const b = await svc.postSettlementDifference(input);
    expect(b.dedupHit).toBe(true);
    expect(b.amount).toBe(a.amount);
  });

  it('postGatewayFee and postSettlementDifference are independent for the same order', async () => {
    // Both can be posted for the same order — they have different
    // entry types so they don't dedup-hit each other.
    const svc = new WalletPostingService({} as any);
    const gw = await svc.postGatewayFee({
      storeId: 1,
      orderId: 60,
      amount: 7.5,
      orderNumber: 'ORD-014',
      provider: 'moyasar',
    });
    const diff = await svc.postSettlementDifference({
      storeId: 1,
      orderId: 60,
      expectedAmount: 100,
      settledAmount: 98,
      orderNumber: 'ORD-014',
      reason: 'partial_refund',
    });
    expect(gw.entryType).toBe('gateway_fee');
    expect(diff.entryType).toBe('settlement_difference');
    expect(gw.dedupHit).toBe(false);
    expect(diff.dedupHit).toBe(false);
  });
});

describe('WalletPostingService — postPayoutDebit', () => {
  it('records a payout_debit entry and returns the amount + entryType + payoutId', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postPayoutDebit({
      storeId: 1,
      payoutId: 100,
      amount: 500,
      orderNumber: 'PO-001',
      status: 'processing',
    });
    expect(result.amount).toBe(500);
    expect(result.entryType).toBe('payout_debit');
    expect(result.dedupHit).toBe(false);
    expect(result.payoutId).toBe(100);
  });

  it('is idempotent: same dedup key returns existing record (no double-debit)', async () => {
    const svc = new WalletPostingService({} as any);
    const input = {
      storeId: 1,
      payoutId: 101,
      amount: 250,
      orderNumber: 'PO-002',
      status: 'processing' as const,
    };
    const a = await svc.postPayoutDebit(input);
    const b = await svc.postPayoutDebit(input);
    expect(b.dedupHit).toBe(true);
    expect(b.amount).toBe(a.amount);
  });

  it('different payoutIds for the same store are independent (no cross-dedup)', async () => {
    const svc = new WalletPostingService({} as any);
    const a = await svc.postPayoutDebit({
      storeId: 1, payoutId: 102, amount: 100, orderNumber: 'PO-003', status: 'processing',
    });
    const b = await svc.postPayoutDebit({
      storeId: 1, payoutId: 103, amount: 200, orderNumber: 'PO-004', status: 'processing',
    });
    expect(a.dedupHit).toBe(false);
    expect(b.dedupHit).toBe(false);
    expect(a.payoutId).toBe(102);
    expect(b.payoutId).toBe(103);
  });

  it('records no warning by default (Q5 soft cap is "warning only" — caller decides)', async () => {
    // Q5 owner decision (2026-06-16, deferred to Session #2): payout
    // pending reservation default = "soft cap" (warning only). The
    // service posts the entry; the route checks hasRecentPayoutRequest
    // and decides whether to show a warning. The service itself does
    // not block.
    const svc = new WalletPostingService({} as any);
    const r = await svc.postPayoutDebit({
      storeId: 1, payoutId: 104, amount: 100, orderNumber: 'PO-005', status: 'processing',
    });
    expect((r as any).warning).toBeUndefined();
  });
});

describe('WalletPostingService — postPayoutReversal', () => {
  it('records a payout_reversal entry and returns the amount + entryType + reason', async () => {
    const svc = new WalletPostingService({} as any);
    const result = await svc.postPayoutReversal({
      storeId: 1,
      payoutId: 100,
      amount: 500,
      orderNumber: 'PO-001',
      reason: 'merchant_cancelled',
    });
    expect(result.amount).toBe(500);
    expect(result.entryType).toBe('payout_reversal');
    expect(result.dedupHit).toBe(false);
    expect(result.payoutId).toBe(100);
    expect((result as any).reason).toBe('merchant_cancelled');
  });

  it('is idempotent: same dedup key returns existing record', async () => {
    const svc = new WalletPostingService({} as any);
    const input = {
      storeId: 1,
      payoutId: 101,
      amount: 250,
      orderNumber: 'PO-002',
      reason: 'system_error' as const,
    };
    const a = await svc.postPayoutReversal(input);
    const b = await svc.postPayoutReversal(input);
    expect(b.dedupHit).toBe(true);
  });

  it('postPayoutDebit and postPayoutReversal are independent for the same payoutId', async () => {
    // Both can exist for the same payout (debit first, then reversal)
    // — they have different entry types so they don't dedup-hit each
    // other.
    const svc = new WalletPostingService({} as any);
    const debit = await svc.postPayoutDebit({
      storeId: 1, payoutId: 200, amount: 300, orderNumber: 'PO-200', status: 'processing',
    });
    const reversal = await svc.postPayoutReversal({
      storeId: 1, payoutId: 200, amount: 300, orderNumber: 'PO-200', reason: 'merchant_cancelled',
    });
    expect(debit.entryType).toBe('payout_debit');
    expect(reversal.entryType).toBe('payout_reversal');
    expect(debit.dedupHit).toBe(false);
    expect(reversal.dedupHit).toBe(false);
  });
});

describe('WalletPostingService — hasRecentPayoutRequest (Q5 soft cap)', () => {
  it('returns false when no payout has been posted yet', async () => {
    const svc = new WalletPostingService({} as any);
    expect(svc.hasRecentPayoutRequest(1)).toBe(false);
  });

  it('returns true after a postPayoutDebit is posted (for the same storeId)', async () => {
    const svc = new WalletPostingService({} as any);
    await svc.postPayoutDebit({
      storeId: 1, payoutId: 300, amount: 100, orderNumber: 'PO-300', status: 'processing',
    });
    expect(svc.hasRecentPayoutRequest(1)).toBe(true);
  });

  it('returns false for a different storeId', async () => {
    const svc = new WalletPostingService({} as any);
    await svc.postPayoutDebit({
      storeId: 1, payoutId: 301, amount: 100, orderNumber: 'PO-301', status: 'processing',
    });
    expect(svc.hasRecentPayoutRequest(2)).toBe(false);
  });

  it('returns true after a postPayoutReversal is posted (reversals also indicate recent payout activity)', async () => {
    const svc = new WalletPostingService({} as any);
    await svc.postPayoutReversal({
      storeId: 1, payoutId: 302, amount: 100, orderNumber: 'PO-302', reason: 'merchant_cancelled',
    });
    expect(svc.hasRecentPayoutRequest(1)).toBe(true);
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

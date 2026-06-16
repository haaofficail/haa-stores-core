// WalletPostingService — central authority for all wallet entry creation.
//
// See TASK-0033 in docs/ops/TASK_TRACKER.md. This service replaces the
// 6 dispersed `recordEntry(...)` call sites identified in the financial
// wallet audit (TASK-0031) with a single, auditable, idempotent
// surface. It is THE only place new wallet entries should be posted
// from; raw `WalletLedger.recordEntry(...)` calls in feature code
// are a code smell (enforced by `tests/wallet-posting-wiring.test.ts`).
//
// Why this matters:
//   - **Audit Finding 1:** Previously 6 call sites across 3 files in
//     2 packages, each picking its own entry type and fields.
//   - **Audit Finding 3:** Refund was a route-level operation in
//     `apps/api/src/routes/orders.ts:131` — bypassed the service layer.
//   - **Audit Finding 4:** Sale and platform_fee could be written
//     twice for the same order (both `checkout.ts` synchronous path
//     AND `payment-webhook-service.ts` async webhook path).
//   - **Phase 4-9 of the audit** (gateway_fee, settlement_difference,
//     refund policy per-provider, payout pending reservation) all
//     need a stable posting surface to hang off.
//
// Idempotency:
//   - Each `post*` method computes a `DedupKey = (storeId, referenceType,
//     referenceId, type)`. If the key was already posted in this
//     service instance's lifetime, the method returns the original
//     result with `dedupHit: true` and does NOT write a new entry.
//   - The dedup map is per-service-instance (not shared), which matches
//     the lifetime of a single request or webhook handler. Cross-
//     instance dedup is the job of a future DB-level constraint.

import { createDbClient, DbClient } from '@haa/db';
import { calcCodFee, CodFeePolicy, describeCodFeePolicy } from '@haa/wallet-core';

export type DedupKey = {
  storeId: number;
  referenceType: 'order' | 'payout' | 'refund' | 'adjustment';
  referenceId: number;
  type: 'sale' | 'platform_fee' | 'cod_fee' | 'refund' | 'payout_debit' | 'payout_reversal' | 'gateway_fee' | 'settlement_difference';
};

export type PolicySource = 'default' | 'fetched';

export type PostResult = {
  amount: number;
  entryType: DedupKey['type'];
  dedupHit: boolean;
  policySource?: PolicySource;
  policyMode?: string;
  policyPct?: number | null;
  policyFixed?: number | null;
  policyDescription?: string;
};

export class WalletPostingService {
  private dedupMap = new Map<string, PostResult>();

  constructor(private db: DbClient = createDbClient()) {}

  // ---------- helpers ----------

  private keyOf(k: Omit<DedupKey, 'type'> & { type: DedupKey['type'] }): string {
    return JSON.stringify({
      storeId: k.storeId,
      referenceType: k.referenceType,
      referenceId: k.referenceId,
      type: k.type,
    });
  }

  private alreadyPosted(key: string): PostResult | null {
    return this.dedupMap.get(key) ?? null;
  }

  private recordPosted(key: string, result: PostResult): void {
    this.dedupMap.set(key, result);
  }

  /**
   * Exposed for tests + advanced callers that need to inspect the
   * dedup state. Most callers should NOT use this — the post*
   * methods are the public surface.
   */
  _hasBeenPosted(key: DedupKey): boolean {
    return this.dedupMap.has(this.keyOf(key));
  }

  // ---------- posting methods ----------

  /**
   * Record a `sale` wallet entry (credit) for a paid order.
   * Idempotent on (storeId, orderId, 'sale').
   */
  async postSale(input: {
    storeId: number;
    orderId: number;
    orderTotal: number;
    orderNumber: string;
    method: 'online' | 'cod' | 'bank_transfer';
  }): Promise<PostResult> {
    const key = this.keyOf({
      storeId: input.storeId,
      referenceType: 'order',
      referenceId: input.orderId,
      type: 'sale',
    });
    const existing = this.alreadyPosted(key);
    if (existing) return { ...existing, dedupHit: true };

    const result: PostResult = {
      amount: input.orderTotal,
      entryType: 'sale',
      dedupHit: false,
    };
    this.recordPosted(key, result);
    return result;
  }

  /**
   * Record a `cod_fee` wallet entry (debit) for a collected COD order.
   * Reads the per-store policy, calculates the fee, and snapshots the
   * policy onto the result. Idempotent on (storeId, orderId, 'cod_fee').
   */
  async postCodFee(input: {
    storeId: number;
    orderId: number;
    orderTotal: number;
    orderNumber: string;
    policy: CodFeePolicy;
  }): Promise<PostResult> {
    const key = this.keyOf({
      storeId: input.storeId,
      referenceType: 'order',
      referenceId: input.orderId,
      type: 'cod_fee',
    });
    const existing = this.alreadyPosted(key);
    if (existing) return { ...existing, dedupHit: true };

    const amount = calcCodFee(input.orderTotal, input.policy);
    // `policySource` indicates whether the calculated fee reflects a
    // real configured policy (`'fetched'`) or a default-equivalent
    // (`'default'`). Mode 'none' is treated as default — the merchant
    // is effectively choosing "no fee", which is the same outcome as
    // falling back to a 0% policy.
    const policySource: PolicySource = input.policy.mode === 'none' ? 'default' : 'fetched';
    const result: PostResult = {
      amount,
      entryType: 'cod_fee',
      dedupHit: false,
      policySource,
      policyMode: input.policy.mode,
      policyPct: input.policy.pct,
      policyFixed: input.policy.fixed,
      policyDescription: describeCodFeePolicy(input.policy),
    };
    this.recordPosted(key, result);
    return result;
  }

  /**
   * Record a `refund` wallet entry. The amount is stored as positive
   * (the `direction: 'debit'` in the entry signals the sign).
   * Idempotent on (storeId, orderId, 'refund').
   */
  async postRefund(input: {
    storeId: number;
    orderId: number;
    amount: number;
    orderNumber: string;
    reason: 'customer_request' | 'duplicate_charge' | 'fraud' | 'merchant_error';
  }): Promise<PostResult> {
    const key = this.keyOf({
      storeId: input.storeId,
      referenceType: 'order',
      referenceId: input.orderId,
      type: 'refund',
    });
    const existing = this.alreadyPosted(key);
    if (existing) return { ...existing, dedupHit: true };

    const result: PostResult = {
      amount: input.amount,
      entryType: 'refund',
      dedupHit: false,
    };
    this.recordPosted(key, result);
    return result;
  }

  // Stub methods for Phase 4-9 of the audit. The full implementations
  // land in Session #2 (TASK-0034). For Session #1 we declare the
  // surface so the type system and call sites can be designed against
  // it without YAGNI.

  postPlatformFee(_input: unknown): Promise<PostResult> {
    throw new Error('postPlatformFee not implemented in Session #1; see TASK-0034 (Session #2).');
  }
  postPayoutDebit(_input: unknown): Promise<PostResult> {
    throw new Error('postPayoutDebit not implemented in Session #1; see TASK-0034 (Session #2).');
  }
  postPayoutReversal(_input: unknown): Promise<PostResult> {
    throw new Error('postPayoutReversal not implemented in Session #1; see TASK-0034 (Session #2).');
  }
  postGatewayFee(_input: unknown): Promise<PostResult> {
    throw new Error('postGatewayFee not implemented in Session #1; see TASK-0034 (Session #2).');
  }
  postSettlementDifference(_input: unknown): Promise<PostResult> {
    throw new Error('postSettlementDifference not implemented in Session #1; see TASK-0034 (Session #2).');
  }
}

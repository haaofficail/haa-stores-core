import { eq, and, count, gte, lte, or, like, sql, desc } from 'drizzle-orm';
import { createDbClient, type DbOrTx, type DbTransaction } from '@haa/db';
import * as s from '@haa/db/schema';
import type { WalletEntryType, WalletEntryDirection, WalletEntryStatus } from '@haa/shared';
import Decimal from 'decimal.js';

// DECISION-OS-018: every entry type below has a DB-level partial unique
// index on (store_id, reference_id) scoped by (type, reference_type).
// Migration 0062 introduced platform_fee. Migration 0073 introduced the
// other six: sale, cod_fee, refund, gateway_fee, payout_debit,
// payout_reversal, settlement_difference. The shape matches the index
// `where` clause so `onConflictDoNothing` lands on the right index.
type IdempotentSpec = { type: string; referenceType: string; where: string };

function resolveIdempotentSpec(input: { type: string; referenceType?: string; referenceId?: number }): IdempotentSpec | null {
  if (input.referenceId == null) return null;
  const t = input.type;
  const rt = input.referenceType;
  if (t === 'platform_fee' && rt === 'order') return { type: t, referenceType: rt, where: `type = 'platform_fee' AND reference_type = 'order'` };
  if (t === 'sale' && rt === 'order') return { type: t, referenceType: rt, where: `type = 'sale' AND reference_type = 'order'` };
  if (t === 'cod_fee' && rt === 'order') return { type: t, referenceType: rt, where: `type = 'cod_fee' AND reference_type = 'order'` };
  if (t === 'refund' && rt === 'refund') return { type: t, referenceType: rt, where: `type = 'refund' AND reference_type = 'refund'` };
  if (t === 'gateway_fee' && rt === 'order') return { type: t, referenceType: rt, where: `type = 'gateway_fee' AND reference_type = 'order'` };
  if (t === 'payout_debit' && rt === 'payout') return { type: t, referenceType: rt, where: `type = 'payout_debit' AND reference_type = 'payout'` };
  if (t === 'payout_reversal' && rt === 'payout') return { type: t, referenceType: rt, where: `type = 'payout_reversal' AND reference_type = 'payout'` };
  if (t === 'settlement_difference' && rt === 'adjustment') return { type: t, referenceType: rt, where: `type = 'settlement_difference' AND reference_type = 'adjustment'` };
  return null;
}

interface LedgerEntryInput {
  storeId: number;
  type: WalletEntryType;
  direction: WalletEntryDirection;
  amount: number;
  referenceType?: string;
  referenceId?: number;
  description?: string;
  status?: WalletEntryStatus;
  /**
   * Fee-snapshot fields. When recording a `platform_fee` or `payment_fee`
   * entry, the caller MUST pass the exact `feeRatePct`, `feeFixed`, and
   * `feeSource` that produced the amount, so historical entries are
   * immutable and traceable even if the store's billing policy changes later.
   */
  feeRatePct?: number | null;
  feeFixed?: number | null;
  feeSource?: string | null;
  metadata?: Record<string, unknown>;
}

interface ProviderTransactionInput {
  storeId: number;
  provider: 'geidea';
  providerTransactionId: string;
  orderId: number;
  orderNumber?: string;
  amount: number;
  currency?: string;
  gatewayFees?: number;
  platformFees?: number;
  status?: string;
}

type PayoutStatus =
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'transfer_pending'
  | 'transferred'
  | 'proof_uploaded'
  | 'transfer_verified'
  | 'failed'
  | 'cancelled'
  | 'reversed';

interface PayoutActionContext {
  actorUserId: number;
  actorRole: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface TransferProofInput {
  bankReference: string;
  bankName: string;
  transferredAt: Date;
  beneficiaryName: string;
  beneficiaryIbanMasked: string;
  proofFileKey?: string;
  notes?: string;
}

export class WalletLedger {
  constructor(private db: DbOrTx = createDbClient()) {}

  async ensureAccount(storeId: number) {
    let [account] = await this.db.select().from(s.walletAccounts)
      .where(eq(s.walletAccounts.storeId, storeId)).limit(1);
    if (!account) {
      [account] = await this.db.insert(s.walletAccounts).values({
        storeId, balance: '0', pendingBalance: '0', availableBalance: '0',
      }).returning();
    }
    return account;
  }

  /**
   * Transaction-scoped account fetch with a row-level lock.
   *
   * P0-2 from the deep audit: `recordEntry` was reading the account row
   * via `this.db` (NOT the active `tx`), then computing the new balance
   * in JS, then writing it back inside the transaction. Two concurrent
   * recordEntry calls could read the same starting balance and both
   * write `balance + amount`, losing one of the updates. This is a
   * silent money-loss bug under any real concurrency.
   *
   * Fix: read inside the transaction with `FOR UPDATE`, which holds a
   * row lock for the lifetime of the transaction. The second concurrent
   * `recordEntry` blocks on this read until the first commits, then
   * sees the post-commit balance and applies its delta on top.
   *
   * If the row doesn't exist yet, we insert (also inside the tx) and
   * the insert itself holds the lock for that row going forward.
   */
  private async ensureAccountForUpdate(
    tx: DbTransaction,
    storeId: number,
  ) {
    const rows = await tx.execute(
      sql`SELECT * FROM ${s.walletAccounts} WHERE ${s.walletAccounts.storeId} = ${storeId} LIMIT 1 FOR UPDATE`,
    );
    const row = (rows as unknown as { rows?: unknown[] }).rows?.[0]
      ?? (Array.isArray(rows) ? rows[0] : undefined);
    if (row) return row as typeof s.walletAccounts.$inferSelect;
    const [created] = await tx.insert(s.walletAccounts).values({
      storeId, balance: '0', pendingBalance: '0', availableBalance: '0',
    }).returning();
    return created;
  }

  /**
   * Idempotency check: returns true if a `platform_fee` wallet entry
   * already exists for this store + order reference. Used to prevent
   * double-charge when a payment webhook is replayed or when the
   * checkout flow runs more than once for the same order.
   *
   * The natural unique key for a platform_fee is
   * `(store_id, reference_type='order', reference_id=<orderId>, type='platform_fee')`.
   * The lookup is cheap (indexed on `referenceIdx`).
   */
  async hasPlatformFeeForOrder(storeId: number, orderId: number): Promise<boolean> {
    const [existing] = await this.db
      .select({ id: s.walletEntries.id })
      .from(s.walletEntries)
      .where(and(
        eq(s.walletEntries.storeId, storeId),
        eq(s.walletEntries.type, 'platform_fee'),
        eq(s.walletEntries.referenceType, 'order'),
        eq(s.walletEntries.referenceId, orderId),
      ))
      .limit(1);
    return !!existing;
  }

  async recordEntry(input: LedgerEntryInput) {
    return this.db.transaction(async (tx) => {
      // P0-2 audit fix: read+lock the account row inside this tx so two
      // concurrent recordEntry calls can't both compute newBalance from
      // the same stale starting value.
      const account = await this.ensureAccountForUpdate(tx, input.storeId);

      const balanceBefore = new Decimal(account.balance);
      let balanceAfter = balanceBefore;
      const pendingBefore = new Decimal(account.pendingBalance);
      let pendingAfter = pendingBefore;
      const availableBefore = new Decimal(account.availableBalance);
      let availableAfter = availableBefore;

      const status = input.status ?? 'pending';

      if (input.direction === 'credit') {
        balanceAfter = balanceBefore.plus(input.amount);
        if (status === 'available') {
          availableAfter = availableBefore.plus(input.amount);
        } else {
          pendingAfter = pendingBefore.plus(input.amount);
        }
      } else {
        balanceAfter = balanceBefore.minus(input.amount);
        if (status === 'available' || input.type === 'payout' || input.type === 'payout_debit') {
          availableAfter = availableBefore.minus(input.amount);
        } else {
          pendingAfter = pendingBefore.minus(input.amount);
        }
      }

      const values = {
        storeId: input.storeId,
        walletAccountId: account.id,
        type: input.type,
        direction: input.direction,
        amount: input.amount.toString(),
        balanceBefore: balanceBefore.toString(),
        balanceAfter: balanceAfter.toString(),
        status,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        description: input.description ?? null,
        feeRatePct: input.feeRatePct != null ? input.feeRatePct.toString() : null,
        feeFixed: input.feeFixed != null ? input.feeFixed.toString() : null,
        feeSource: input.feeSource ?? null,
        metadata: input.metadata ?? null,
      };

      // DB-level idempotency for wallet entries that are bound to a unique
      // reference (DECISION-OS-018 / migrations 0062 + 0073). The partial
      // unique indexes make a duplicate impossible even under webhook replay
      // / concurrency. On conflict we do a no-op insert and return the
      // EXISTING entry WITHOUT touching balances (the original entry already
      // moved them) — so a replay can never double-charge or double-count.
      const idempotentSpec = resolveIdempotentSpec(input);

      const [entry] = idempotentSpec
        ? await tx.insert(s.walletEntries).values(values).onConflictDoNothing({
            target: [s.walletEntries.storeId, s.walletEntries.referenceId],
            where: sql.raw(idempotentSpec.where),
          }).returning()
        : await tx.insert(s.walletEntries).values(values).returning();

      if (idempotentSpec && !entry) {
        const [existing] = await tx.select().from(s.walletEntries).where(and(
          eq(s.walletEntries.storeId, input.storeId),
          eq(s.walletEntries.type, idempotentSpec.type),
          eq(s.walletEntries.referenceType, idempotentSpec.referenceType),
          eq(s.walletEntries.referenceId, input.referenceId!),
        )).limit(1);
        return existing;
      }

      await tx.update(s.walletAccounts).set({
        balance: balanceAfter.toString(),
        pendingBalance: pendingAfter.toString(),
        availableBalance: availableAfter.toString(),
        totalSales: input.type === 'sale' && input.direction === 'credit'
          ? new Decimal(account.totalSales).plus(input.amount).toString()
          : account.totalSales,
        totalFees: (input.type === 'platform_fee' || input.type === 'payment_fee')
          ? new Decimal(account.totalFees).plus(input.amount).toString()
          : account.totalFees,
        totalPayouts: (input.type === 'payout' || input.type === 'payout_debit') && input.direction === 'debit'
          ? new Decimal(account.totalPayouts ?? 0).plus(input.amount).toString()
          : account.totalPayouts,
        updatedAt: new Date(),
      }).where(eq(s.walletAccounts.id, account.id));

      return entry;
    });
  }

  async recordPendingMerchantPayable(input: ProviderTransactionInput) {
    const existing = await this.db.select().from(s.walletEntries)
      .where(and(
        eq(s.walletEntries.storeId, input.storeId),
        eq(s.walletEntries.referenceType, 'payment'),
        eq(s.walletEntries.referenceId, input.orderId),
      ))
      .limit(1);
    if (existing.length > 0) return existing[0];

    const gatewayFees = new Decimal(input.gatewayFees ?? 0);
    const platformFees = new Decimal(input.platformFees ?? 0);
    const merchantPayable = new Decimal(input.amount).minus(gatewayFees).minus(platformFees);

    await this.db.insert(s.paymentProviderTransactions).values({
      storeId: input.storeId,
      provider: input.provider,
      providerTransactionId: input.providerTransactionId,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      amount: input.amount.toString(),
      currency: input.currency ?? 'SAR',
      gatewayFees: gatewayFees.toString(),
      platformFees: platformFees.toString(),
      merchantPayable: merchantPayable.toString(),
      status: input.status ?? 'captured',
      reconciliationStatus: 'pending',
    });

    return this.recordEntry({
      storeId: input.storeId,
      type: 'sale',
      direction: 'credit',
      amount: merchantPayable.toNumber(),
      referenceType: 'payment',
      referenceId: input.orderId,
      description: `Pending merchant payable for ${input.providerTransactionId}`,
      status: 'pending',
      metadata: {
        provider: input.provider,
        providerTransactionId: input.providerTransactionId,
        gatewayFees: gatewayFees.toNumber(),
        platformFees: platformFees.toNumber(),
        reconciliationStatus: 'pending',
      },
    });
  }

  async markPaymentReconciled(storeId: number, orderId: number, providerTransactionId: string) {
    return this.db.transaction(async (tx) => {
      const [entry] = await tx.select().from(s.walletEntries)
        .where(and(
          eq(s.walletEntries.storeId, storeId),
          eq(s.walletEntries.referenceType, 'payment'),
          eq(s.walletEntries.referenceId, orderId),
          eq(s.walletEntries.status, 'pending'),
        ))
        .limit(1);
      if (!entry) throw new Error('Pending wallet entry not found');

      const [account] = await tx.select().from(s.walletAccounts)
        .where(eq(s.walletAccounts.id, entry.walletAccountId))
        .limit(1);
      if (!account) throw new Error('Wallet account not found');

      const amount = new Decimal(entry.amount);
      await tx.update(s.walletAccounts).set({
        pendingBalance: new Decimal(account.pendingBalance).minus(amount).toString(),
        availableBalance: new Decimal(account.availableBalance).plus(amount).toString(),
        updatedAt: new Date(),
      }).where(eq(s.walletAccounts.id, account.id));

      const [updated] = await tx.update(s.walletEntries).set({ status: 'available' })
        .where(eq(s.walletEntries.id, entry.id))
        .returning();

      await tx.update(s.paymentProviderTransactions).set({
        reconciliationStatus: 'matched',
        updatedAt: new Date(),
      }).where(and(
        eq(s.paymentProviderTransactions.storeId, storeId),
        eq(s.paymentProviderTransactions.providerTransactionId, providerTransactionId),
      ));

      return updated;
    });
  }

  async requestPayout(storeId: number, amount: number, requestedByUserId?: number) {
    const account = await this.ensureAccount(storeId);
    const payoutAmount = new Decimal(amount);
    if (payoutAmount.lte(0)) throw new Error('Payout amount must be greater than zero');
    if (payoutAmount.gt(new Decimal(account.availableBalance))) throw new Error('Payout cannot exceed available balance');

    const [store] = await this.db.select().from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
    if (!store || !store.isActive || store.status === 'suspended') {
      throw new Error('Payout blocked while store is suspended or inactive');
    }

    const [kyc] = await this.db.select().from(s.kycProfiles).where(eq(s.kycProfiles.storeId, storeId)).limit(1);
    if (!kyc || kyc.status !== 'approved') throw new Error('KYC must be approved before payouts are enabled');

    const [bankAccount] = await this.db.select().from(s.merchantBankAccounts)
      .where(and(eq(s.merchantBankAccounts.storeId, storeId), eq(s.merchantBankAccounts.status, 'verified')))
      .limit(1);
    if (!bankAccount) throw new Error('A verified bank account is required before payout');

    const failedReconciliation = await this.db.select().from(s.paymentProviderTransactions)
      .where(and(eq(s.paymentProviderTransactions.storeId, storeId), eq(s.paymentProviderTransactions.reconciliationStatus, 'failed')))
      .limit(1);
    if (failedReconciliation.length > 0) throw new Error('Payout blocked while reconciliation has failed transactions');

    const openRefundRisk = await this.db.select().from(s.paymentTransactions)
      .innerJoin(s.payments, eq(s.paymentTransactions.paymentId, s.payments.id))
      .where(and(
        eq(s.payments.storeId, storeId),
        eq(s.paymentTransactions.type, 'refund'),
        or(eq(s.paymentTransactions.status, 'pending'), eq(s.paymentTransactions.status, 'received')),
      ))
      .limit(1);
    if (openRefundRisk.length > 0) throw new Error('Payout blocked while refund risk is still open');

    const openDisputeRisk = await this.db.select().from(s.payments)
      .where(and(eq(s.payments.storeId, storeId), eq(s.payments.status, 'disputed')))
      .limit(1);
    const openChargebackRisk = await this.db.select().from(s.paymentTransactions)
      .innerJoin(s.payments, eq(s.paymentTransactions.paymentId, s.payments.id))
      .where(and(
        eq(s.payments.storeId, storeId),
        eq(s.paymentTransactions.type, 'chargeback'),
        or(eq(s.paymentTransactions.status, 'pending'), eq(s.paymentTransactions.status, 'received')),
      ))
      .limit(1);
    if (openDisputeRisk.length > 0 || openChargebackRisk.length > 0) {
      throw new Error('Payout blocked while chargeback or dispute risk is still open');
    }

    const reference = `payout_${storeId}_${Date.now()}`;
    const [request] = await this.db.insert(s.payoutRequests).values({
      storeId,
      walletAccountId: account.id,
      amount: payoutAmount.toString(),
      currency: 'SAR',
      status: 'requested',
      reference,
      bankAccountId: bankAccount.id,
      requestedByUserId,
      metadata: { livePayoutEnabled: false },
    }).returning();

    await this.recordPayoutEvent(request.id, storeId, {
      actorUserId: requestedByUserId ?? null,
      actorRole: 'merchant',
      eventType: 'payout_requested',
      fromStatus: null,
      toStatus: 'requested',
      amount: payoutAmount.toString(),
      metadata: { reference, livePayoutEnabled: false },
    });

    return request;
  }

  async failPayout(storeId: number, payoutId: number, reason: string) {
    const [request] = await this.db.select().from(s.payoutRequests)
      .where(and(eq(s.payoutRequests.id, payoutId), eq(s.payoutRequests.storeId, storeId)))
      .limit(1);
    if (!request) throw new Error('Payout request not found');
    if (request.status === 'paid') throw new Error('Paid payout cannot be failed');

    await this.db.update(s.payoutRequests).set({
      status: 'failed',
      failureReason: reason,
      failedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(s.payoutRequests.id, payoutId), eq(s.payoutRequests.storeId, storeId)));

    return this.recordEntry({
      storeId,
      type: 'payout_reversal',
      direction: 'credit',
      amount: Number(request.amount),
      referenceType: 'payout',
      referenceId: payoutId,
      description: `Payout failed: ${reason}`,
      status: 'available',
      metadata: { failedPayoutReference: request.reference },
    });
  }

  async getPayout(storeId: number, payoutId: number) {
    const [payout] = await this.db.select().from(s.payoutRequests)
      .where(and(eq(s.payoutRequests.id, payoutId), eq(s.payoutRequests.storeId, storeId)))
      .limit(1);
    if (!payout) return null;
    const proofs = await this.db.select().from(s.payoutTransferProofs)
      .where(eq(s.payoutTransferProofs.payoutRequestId, payout.id))
      .orderBy(desc(s.payoutTransferProofs.createdAt));
    const events = await this.db.select().from(s.payoutEvents)
      .where(eq(s.payoutEvents.payoutRequestId, payout.id))
      .orderBy(desc(s.payoutEvents.createdAt));
    return { ...payout, proofs, events };
  }

  async listAllPayouts(status?: string) {
    if (status) {
      return this.db.select().from(s.payoutRequests)
        .where(eq(s.payoutRequests.status, status))
        .orderBy(desc(s.payoutRequests.createdAt));
    }
    return this.db.select().from(s.payoutRequests).orderBy(desc(s.payoutRequests.createdAt));
  }

  async reviewPayout(payoutId: number, ctx: PayoutActionContext) {
    return this.transitionPayout(payoutId, 'requested', 'under_review', 'payout_review_started', {
      reviewedByUserId: ctx.actorUserId,
      reviewedAt: new Date(),
    }, ctx);
  }

  async approvePayout(payoutId: number, ctx: PayoutActionContext) {
    const payout = await this.getPayoutById(payoutId);
    if (payout.requestedByUserId === ctx.actorUserId) {
      throw new Error('Maker-checker violation: requester cannot approve payout');
    }
    return this.transitionPayout(payoutId, 'under_review', 'approved', 'payout_approved', {
      approvedByUserId: ctx.actorUserId,
      approvedAt: new Date(),
    }, ctx);
  }

  async rejectPayout(payoutId: number, ctx: PayoutActionContext) {
    const payout = await this.getPayoutById(payoutId);
    if (payout.status !== 'under_review') throw new Error('Can only reject payout under review');
    if (!ctx.reason) throw new Error('Rejection reason is required');
    return this.transitionPayout(payoutId, 'under_review', 'rejected', 'payout_rejected', {
      rejectedByUserId: ctx.actorUserId,
      rejectionReason: ctx.reason,
    }, ctx);
  }

  async markTransferPending(payoutId: number, ctx: PayoutActionContext) {
    return this.transitionPayout(payoutId, 'approved', 'transfer_pending', 'payout_marked_transfer_pending', {}, ctx);
  }

  async markTransferred(payoutId: number, ctx: PayoutActionContext) {
    const payout = await this.getPayoutById(payoutId);
    if (payout.approvedByUserId === ctx.actorUserId) {
      throw new Error('Maker-checker violation: approver cannot mark payout transferred');
    }
    return this.transitionPayout(payoutId, 'transfer_pending', 'transferred', 'payout_marked_transferred', {
      transferredByUserId: ctx.actorUserId,
      transferredAt: new Date(),
    }, ctx);
  }

  async uploadTransferProof(payoutId: number, proof: TransferProofInput, ctx: PayoutActionContext) {
    const payout = await this.getPayoutById(payoutId);
    if (payout.status !== 'transferred') throw new Error('Transfer proof can only be uploaded after transferred status');
    if (payout.transferredByUserId !== ctx.actorUserId) {
      throw new Error('Only the transfer actor can upload transfer proof');
    }
    if (!proof.beneficiaryIbanMasked || proof.beneficiaryIbanMasked.replace(/\s/g, '').length > 12) {
      throw new Error('Only masked IBAN may be stored with transfer proof');
    }

    await this.db.insert(s.payoutTransferProofs).values({
      payoutRequestId: payoutId,
      bankReference: proof.bankReference,
      bankName: proof.bankName,
      amount: payout.amount,
      currency: payout.currency,
      transferredAt: proof.transferredAt,
      transferredByUserId: ctx.actorUserId,
      beneficiaryName: proof.beneficiaryName,
      beneficiaryIbanMasked: proof.beneficiaryIbanMasked,
      proofFileKey: proof.proofFileKey,
      notes: proof.notes,
      verificationStatus: 'pending',
    });

    return this.transitionPayout(payoutId, 'transferred', 'proof_uploaded', 'payout_transfer_proof_uploaded', {}, ctx);
  }

  async verifyTransfer(payoutId: number, ctx: PayoutActionContext) {
    const payout = await this.getPayoutById(payoutId);
    if (payout.status !== 'proof_uploaded') throw new Error('Cannot verify transfer without uploaded proof');
    if (payout.transferredByUserId === ctx.actorUserId) {
      throw new Error('Maker-checker violation: transfer actor cannot verify transfer');
    }
    if (payout.requestedByUserId === ctx.actorUserId) {
      throw new Error('Maker-checker violation: requester cannot verify transfer');
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx.update(s.payoutRequests).set({
        status: 'transfer_verified',
        verifiedByUserId: ctx.actorUserId,
        verifiedAt: new Date(),
        paidAt: new Date(),
        updatedAt: new Date(),
      }).where(and(eq(s.payoutRequests.id, payoutId), eq(s.payoutRequests.status, 'proof_uploaded'))).returning();
      if (!updated) throw new Error('Payout status changed before verification');

      await tx.update(s.payoutTransferProofs).set({
        verificationStatus: 'verified',
        verifiedByUserId: ctx.actorUserId,
        verifiedAt: new Date(),
      }).where(eq(s.payoutTransferProofs.payoutRequestId, payoutId));

      await this.recordPayoutEvent(payoutId, payout.storeId, {
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        eventType: 'payout_transfer_verified',
        fromStatus: 'proof_uploaded',
        toStatus: 'transfer_verified',
        amount: payout.amount,
        reason: ctx.reason,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    });

    await this.recordEntry({
      storeId: payout.storeId,
      type: 'payout_debit',
      direction: 'debit',
      amount: Number(payout.amount),
      referenceType: 'payout',
      referenceId: payout.id,
      description: 'Manual payout transfer verified',
      status: 'available',
      metadata: { reference: payout.reference, liveBankTransfer: false },
    });

    return this.getPayoutById(payoutId);
  }

  async cancelPayout(payoutId: number, ctx: PayoutActionContext) {
    const payout = await this.getPayoutById(payoutId);
    if (payout.status === 'transfer_verified') throw new Error('Verified payout cannot be cancelled');
    if (!ctx.reason) throw new Error('Cancellation reason is required');
    return this.transitionAnyPayout(payoutId, 'cancelled', 'payout_cancelled', ctx);
  }

  async reversePayout(payoutId: number, ctx: PayoutActionContext) {
    const payout = await this.getPayoutById(payoutId);
    if (payout.status !== 'transfer_verified') throw new Error('Only verified payouts can be reversed');
    if (!ctx.reason) throw new Error('Reversal reason is required');
    await this.transitionPayout(payoutId, 'transfer_verified', 'reversed', 'payout_reversed', {}, ctx);
    return this.recordEntry({
      storeId: payout.storeId,
      type: 'payout_reversal',
      direction: 'credit',
      amount: Number(payout.amount),
      referenceType: 'payout',
      referenceId: payout.id,
      description: `Payout reversed: ${ctx.reason}`,
      status: 'available',
      metadata: { reference: payout.reference },
    });
  }

  private async getPayoutById(payoutId: number) {
    const [payout] = await this.db.select().from(s.payoutRequests)
      .where(eq(s.payoutRequests.id, payoutId))
      .limit(1);
    if (!payout) throw new Error('Payout request not found');
    return payout;
  }

  private async transitionPayout(
    payoutId: number,
    fromStatus: PayoutStatus,
    toStatus: PayoutStatus,
    eventType: string,
    patch: Partial<typeof s.payoutRequests.$inferInsert>,
    ctx: PayoutActionContext,
  ) {
    const payout = await this.getPayoutById(payoutId);
    if (payout.status !== fromStatus) {
      throw new Error(`Invalid payout transition: ${payout.status} -> ${toStatus}`);
    }
    const [updated] = await this.db.update(s.payoutRequests).set({
      ...patch,
      status: toStatus,
      updatedAt: new Date(),
    }).where(and(eq(s.payoutRequests.id, payoutId), eq(s.payoutRequests.status, fromStatus))).returning();
    if (!updated) throw new Error('Payout status changed before transition');
    await this.recordPayoutEvent(payoutId, payout.storeId, {
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      eventType,
      fromStatus,
      toStatus,
      amount: payout.amount,
      reason: ctx.reason,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return updated;
  }

  private async transitionAnyPayout(
    payoutId: number,
    toStatus: PayoutStatus,
    eventType: string,
    ctx: PayoutActionContext,
  ) {
    const payout = await this.getPayoutById(payoutId);
    const [updated] = await this.db.update(s.payoutRequests).set({
      status: toStatus,
      updatedAt: new Date(),
    }).where(eq(s.payoutRequests.id, payoutId)).returning();
    await this.recordPayoutEvent(payoutId, payout.storeId, {
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      eventType,
      fromStatus: payout.status,
      toStatus,
      amount: payout.amount,
      reason: ctx.reason,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return updated;
  }

  private async recordPayoutEvent(
    payoutRequestId: number,
    storeId: number,
    event: {
      actorUserId: number | null;
      actorRole: string;
      eventType: string;
      fromStatus: string | null;
      toStatus: string | null;
      amount?: string | null;
      reason?: string;
      metadata?: Record<string, unknown>;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    await this.db.insert(s.payoutEvents).values({
      payoutRequestId,
      storeId,
      actorUserId: event.actorUserId,
      actorRole: event.actorRole,
      eventType: event.eventType,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      amount: event.amount,
      reason: event.reason,
      metadata: event.metadata,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    });
  }

  async recordRefundReserve(storeId: number, orderId: number, amount: number, afterPayout = false) {
    return this.recordEntry({
      storeId,
      type: afterPayout ? 'adjustment' : 'refund',
      direction: 'debit',
      amount,
      referenceType: 'refund',
      referenceId: orderId,
      description: afterPayout ? 'Post-payout refund reserve adjustment' : 'Refund reserve before payout',
      status: 'available',
      metadata: { refundReserve: true, afterPayout },
    });
  }

  async getSummary(storeId: number) {
    const account = await this.ensureAccount(storeId);

    const [entryCountResult] = await this.db.select({ total: count() })
      .from(s.walletEntries)
      .where(eq(s.walletEntries.storeId, storeId));

    const [lastEntry] = await this.db.select({ createdAt: s.walletEntries.createdAt })
      .from(s.walletEntries)
      .where(eq(s.walletEntries.storeId, storeId))
      .orderBy(desc(s.walletEntries.createdAt))
      .limit(1);

    const typeSums = await this.db.select({
      type: s.walletEntries.type,
      direction: s.walletEntries.direction,
      total: sql<string>`COALESCE(SUM(${s.walletEntries.amount}), 0)`,
    })
      .from(s.walletEntries)
      .where(eq(s.walletEntries.storeId, storeId))
      .groupBy(s.walletEntries.type, s.walletEntries.direction);

    const sumByType = (type: string, direction: string): Decimal => {
      const found = typeSums.find(t => t.type === type && t.direction === direction);
      return new Decimal(found ? found.total : 0);
    };

    const totalSales = sumByType('sale', 'credit');
    const platformFees = sumByType('platform_fee', 'debit');
    const paymentFees = sumByType('payment_fee', 'debit');
    const shippingFees = sumByType('shipping_fee', 'debit');
    const refunds = sumByType('refund', 'debit');
    const payouts = sumByType('payout', 'debit').plus(sumByType('payout_debit', 'debit'));
    const totalFees = platformFees.plus(paymentFees).plus(shippingFees);
    const netBalance = totalSales.minus(totalFees).minus(refunds).minus(payouts);

    return {
      balance: new Decimal(account.balance).toNumber(),
      pendingBalance: new Decimal(account.pendingBalance).toNumber(),
      availableBalance: new Decimal(account.availableBalance).toNumber(),
      totalSales: totalSales.toNumber(),
      totalFees: new Decimal(account.totalFees).toNumber(),
      totalPayouts: new Decimal(account.totalPayouts ?? 0).toNumber(),
      // Backward-compat: keep flat field names that existing UI uses.
      platformFees: platformFees.toNumber(),
      paymentFees: paymentFees.toNumber(),
      shippingFees: shippingFees.toNumber(),
      refunds: refunds.toNumber(),
      // Phase 10 — structured fees block. The flat fields above stay for
      // backward compat; the new nested block is the canonical source going
      // forward and matches the engineering brief.
      //
      // NOTE: `paymentAdjustments` was intentionally dropped from the
      // structured response. There is no `payment_fee_adjustment`
      // `WalletEntryType` today, so a no-op SUM field in the public
      // surface would only confuse future readers. If/when that type
      // is introduced, add it back here and to the WalletEntryType
      // union in `packages/shared/src/types/orders.ts`.
      fees: {
        platform: platformFees.toNumber(),
        paymentProcessing: paymentFees.toNumber(),
        total: totalFees.toNumber(),
      },
      netBalance: netBalance.toNumber(),
      entryCount: Number(entryCountResult?.total ?? 0),
      lastUpdated: lastEntry?.createdAt?.toISOString() ?? null,
    };
  }

  async getSettlementReadiness(storeId: number) {
    const [store] = await this.db.select().from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
    const [kyc] = await this.db.select().from(s.kycProfiles).where(eq(s.kycProfiles.storeId, storeId)).limit(1);
    const [bankAccount] = await this.db.select().from(s.merchantBankAccounts)
      .where(and(eq(s.merchantBankAccounts.storeId, storeId), eq(s.merchantBankAccounts.status, 'verified')))
      .limit(1);
    const [readiness] = await this.db.select().from(s.walletSettlementReadiness)
      .where(or(eq(s.walletSettlementReadiness.storeId, storeId), sql`${s.walletSettlementReadiness.storeId} IS NULL`))
      .limit(1);
    const reconciliationFailures = await this.db.select().from(s.paymentProviderTransactions)
      .where(and(eq(s.paymentProviderTransactions.storeId, storeId), eq(s.paymentProviderTransactions.reconciliationStatus, 'failed')))
      .limit(1);
    const openRefundRisk = await this.db.select().from(s.paymentTransactions)
      .innerJoin(s.payments, eq(s.paymentTransactions.paymentId, s.payments.id))
      .where(and(
        eq(s.payments.storeId, storeId),
        eq(s.paymentTransactions.type, 'refund'),
        or(eq(s.paymentTransactions.status, 'pending'), eq(s.paymentTransactions.status, 'received')),
      ))
      .limit(1);
    const openDisputeRisk = await this.db.select().from(s.payments)
      .where(and(eq(s.payments.storeId, storeId), eq(s.payments.status, 'disputed')))
      .limit(1);
    const openChargebackRisk = await this.db.select().from(s.paymentTransactions)
      .innerJoin(s.payments, eq(s.paymentTransactions.paymentId, s.payments.id))
      .where(and(
        eq(s.payments.storeId, storeId),
        eq(s.paymentTransactions.type, 'chargeback'),
        or(eq(s.paymentTransactions.status, 'pending'), eq(s.paymentTransactions.status, 'received')),
      ))
      .limit(1);

    const storeActive = !!store && store.isActive && store.status !== 'suspended';
    const kycApproved = kyc?.status === 'approved';
    const bankAccountVerified = !!bankAccount;
    const reconciliationHealthy = reconciliationFailures.length === 0;
    const refundRiskClear = openRefundRisk.length === 0;
    const disputeRiskClear = openDisputeRisk.length === 0 && openChargebackRisk.length === 0;
    const complianceConfirmed = !!(
      readiness?.safeguardedAccountConfigured &&
      readiness.pspSettlementPartnerConfirmed &&
      readiness.merchantOfRecordConfirmed &&
      readiness.samaComplianceStatus !== 'unconfirmed'
    );
    const ready = storeActive && kycApproved && bankAccountVerified && complianceConfirmed && reconciliationHealthy && refundRiskClear && disputeRiskClear;

    return {
      fundsModel: 'platform_collects_and_settles',
      settlementReadiness: ready ? 'ready' : complianceConfirmed ? 'partial' : 'not_ready',
      complianceStatus: ready ? 'partner_confirmed' : 'requires_psp_or_legal_confirmation',
      liveEnabled: ready, // liveEnabled: false until all seven readiness gates pass
      storeActive,
      kycApproved,
      bankAccountVerified,
      reconciliationHealthy,
      refundRiskClear,
      disputeRiskClear,
      safeguardedAccountConfigured: readiness?.safeguardedAccountConfigured ?? false,
      pspSettlementPartnerConfirmed: readiness?.pspSettlementPartnerConfirmed ?? false,
      merchantOfRecordConfirmed: readiness?.merchantOfRecordConfirmed ?? false,
      samaComplianceStatus: readiness?.samaComplianceStatus ?? 'unconfirmed',
    };
  }

  async getPayouts(storeId: number) {
    return this.db.select().from(s.payoutRequests)
      .where(eq(s.payoutRequests.storeId, storeId))
      .orderBy(desc(s.payoutRequests.createdAt));
  }

  async getSettlementTransactions(storeId: number) {
    return this.db.select().from(s.paymentProviderTransactions)
      .where(eq(s.paymentProviderTransactions.storeId, storeId))
      .orderBy(desc(s.paymentProviderTransactions.createdAt));
  }

  async getSettlementBatches(_storeId: number) {
    return this.db.select().from(s.settlementBatches)
      .orderBy(desc(s.settlementBatches.createdAt));
  }

  async getSettlementBatchDetail(storeId: number, batchId: number) {
    const [batch] = await this.db.select().from(s.settlementBatches)
      .where(eq(s.settlementBatches.id, batchId))
      .limit(1);
    if (!batch) return null;

    const transactions = await this.db.select().from(s.paymentProviderTransactions)
      .where(and(
        eq(s.paymentProviderTransactions.settlementBatchId, batchId),
        eq(s.paymentProviderTransactions.storeId, storeId),
      ))
      .orderBy(desc(s.paymentProviderTransactions.createdAt));

    return { ...batch, transactions };
  }

  async getAdminSettlementBatches() {
    return this.db.select().from(s.settlementBatches)
      .orderBy(desc(s.settlementBatches.createdAt));
  }

  async getAdminSettlementBatchDetail(batchId: number) {
    const [batch] = await this.db.select().from(s.settlementBatches)
      .where(eq(s.settlementBatches.id, batchId))
      .limit(1);
    if (!batch) return null;

    const transactions = await this.db.select().from(s.paymentProviderTransactions)
      .where(eq(s.paymentProviderTransactions.settlementBatchId, batchId))
      .orderBy(desc(s.paymentProviderTransactions.createdAt));

    return { ...batch, transactions };
  }

  async getOrderSettlementInfo(orderId: number, storeId: number) {
    const [txn] = await this.db.select().from(s.paymentProviderTransactions)
      .where(and(
        eq(s.paymentProviderTransactions.orderId, orderId),
        eq(s.paymentProviderTransactions.storeId, storeId),
      ))
      .limit(1);
    if (!txn || !txn.settlementBatchId) return null;

    const [batch] = await this.db.select().from(s.settlementBatches)
      .where(eq(s.settlementBatches.id, txn.settlementBatchId))
      .limit(1);
    if (!batch) return null;

    return {
      settlementBatchId: batch.id,
      settlementReference: `SET-${String(batch.id).padStart(6, '0')}`,
      status: batch.status,
      grossAmount: Number(txn.amount),
      gatewayFees: Number(txn.gatewayFees),
      platformFees: Number(txn.platformFees),
      merchantPayable: Number(txn.merchantPayable),
      reconciliationStatus: txn.reconciliationStatus,
    };
  }

  async getEntries(storeId: number, opts?: {
    page?: number; limit?: number;
    type?: string; direction?: string; status?: string;
    dateFrom?: string; dateTo?: string; search?: string;
  }) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const conditions = [eq(s.walletEntries.storeId, storeId)];

    if (opts?.type) conditions.push(eq(s.walletEntries.type, opts.type));
    if (opts?.direction) conditions.push(eq(s.walletEntries.direction, opts.direction));
    if (opts?.status) conditions.push(eq(s.walletEntries.status, opts.status));
    if (opts?.dateFrom) {
      conditions.push(gte(s.walletEntries.createdAt, new Date(opts.dateFrom)));
    }
    if (opts?.dateTo) {
      const endDate = new Date(opts.dateTo);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(s.walletEntries.createdAt, endDate));
    }
    if (opts?.search) {
      const searchTerm = `%${opts.search}%`;
      conditions.push(or(
        like(s.walletEntries.description, searchTerm),
        like(s.walletEntries.referenceType, searchTerm),
      )!);
    }

    const [totalResult] = await this.db.select({ total: count() })
      .from(s.walletEntries)
      .where(and(...conditions));
    const total = Number(totalResult.total);

    const items = await this.db.select()
      .from(s.walletEntries)
      .where(and(...conditions))
      .limit(limit).offset((page - 1) * limit)
      .orderBy(desc(s.walletEntries.createdAt));

    return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

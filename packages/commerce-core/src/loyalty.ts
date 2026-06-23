import { eq, and, desc, lt, gt, sql } from 'drizzle-orm';
import { createDbClient, type DbOrTx } from '@haa/db';
import * as s from '@haa/db/schema';
import {
  DEFAULT_LOYALTY_RULES,
  computeEarnedPoints,
  computeRedemption,
  computeExpiry,
  pointsToValue,
  type LoyaltyRules,
  type OrderAmounts,
  type RedeemResult,
  type PointsLot,
} from '@haa/loyalty-core';
import {
  LOYALTY_EARNED_EVENT,
  LOYALTY_REDEEMED_EVENT,
  LOYALTY_EXPIRED_EVENT,
} from './outbound-webhook.js';

/**
 * Resolve an OutboundWebhookService lazily to avoid a circular import at
 * module-load time. The webhook service imports nothing from loyalty, but
 * keeping the constructor call deferred keeps the dependency graph simple
 * and lets tests stub the emission by spying on this helper.
 */
async function emitLoyaltyEvent(
  db: DbOrTx,
  storeId: number,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const { OutboundWebhookService } = await import('./outbound-webhook.js');
    await new OutboundWebhookService(db).emit(storeId, eventType, payload);
  } catch (err) {
    // Webhooks are best-effort: never block the loyalty mutation if the
    // delivery layer is mis-configured or unreachable.
    console.error('[loyalty] webhook emit failed:', (err as Error).message);
  }
}

/**
 * LoyaltyService (QA Loyalty) — يدير الإعدادات، الحسابات، والـ ledger.
 * الحساب النقي للنقاط/القيمة يتم في @haa/loyalty-core؛ هنا التخزين والذرّية.
 */
export class LoyaltyService {
  constructor(private db: DbOrTx = createDbClient()) {}

  /** اقرأ قواعد المتجر (أو الافتراضية لو لا إعدادات) */
  async getRules(storeId: number): Promise<LoyaltyRules> {
    const [row] = await this.db.select().from(s.loyaltySettings)
      .where(eq(s.loyaltySettings.storeId, storeId)).limit(1);
    if (!row) return { ...DEFAULT_LOYALTY_RULES };
    return {
      enabled: row.enabled,
      earnRatePerCurrency: Number(row.earnRatePerCurrency),
      redeemValuePerPoint: Number(row.redeemValuePerPoint),
      minRedeemPoints: row.minRedeemPoints,
      maxRedeemPercent: Number(row.maxRedeemPercent),
      pointsExpiryMonths: row.pointsExpiryMonths,
      earnOnTax: row.earnOnTax,
      earnOnShipping: row.earnOnShipping,
      minOrderForEarn: Number(row.minOrderForEarn),
    };
  }

  /** أنشئ/حدّث إعدادات المتجر (upsert) */
  async updateRules(storeId: number, patch: Partial<LoyaltyRules>): Promise<LoyaltyRules> {
    const current = await this.getRules(storeId);
    const merged = { ...current, ...patch };
    const values = {
      storeId,
      enabled: merged.enabled,
      earnRatePerCurrency: String(merged.earnRatePerCurrency),
      redeemValuePerPoint: String(merged.redeemValuePerPoint),
      minRedeemPoints: merged.minRedeemPoints,
      maxRedeemPercent: String(merged.maxRedeemPercent),
      pointsExpiryMonths: merged.pointsExpiryMonths,
      earnOnTax: merged.earnOnTax,
      earnOnShipping: merged.earnOnShipping,
      minOrderForEarn: String(merged.minOrderForEarn),
      updatedAt: new Date(),
    };
    await this.db.insert(s.loyaltySettings).values(values)
      .onConflictDoUpdate({ target: s.loyaltySettings.storeId, set: values });
    return merged;
  }

  /** احصل على حساب العميل أو أنشئه */
  async getOrCreateAccount(storeId: number, customerId: number) {
    const [existing] = await this.db.select().from(s.loyaltyAccounts)
      .where(and(eq(s.loyaltyAccounts.storeId, storeId), eq(s.loyaltyAccounts.customerId, customerId)))
      .limit(1);
    if (existing) return existing;

    await this.db.insert(s.loyaltyAccounts).values({ storeId, customerId })
      .onConflictDoNothing();
    const [created] = await this.db.select().from(s.loyaltyAccounts)
      .where(and(eq(s.loyaltyAccounts.storeId, storeId), eq(s.loyaltyAccounts.customerId, customerId)))
      .limit(1);
    return created;
  }

  async getBalance(storeId: number, customerId: number): Promise<number> {
    const [acc] = await this.db.select({ balance: s.loyaltyAccounts.balance }).from(s.loyaltyAccounts)
      .where(and(eq(s.loyaltyAccounts.storeId, storeId), eq(s.loyaltyAccounts.customerId, customerId)))
      .limit(1);
    return acc?.balance ?? 0;
  }

  /**
   * اكسب نقاطاً من طلب — idempotent عبر (store, order) بفضل الفهرس الجزئي.
   * إعادة الاستدعاء لنفس الطلب لا تضاعف النقاط.
   */
  async earnFromOrder(input: {
    storeId: number;
    customerId: number;
    orderId: number;
    orderNumber?: string;
    amounts: OrderAmounts;
  }): Promise<{ earned: number; duplicate: boolean }> {
    const rules = await this.getRules(input.storeId);
    const points = computeEarnedPoints(rules, input.amounts);
    if (points <= 0) return { earned: 0, duplicate: false };

    // مسار سريع: لو سبق الكسب لهذا الطلب
    const [dup] = await this.db.select({ id: s.loyaltyTransactions.id }).from(s.loyaltyTransactions)
      .where(and(
        eq(s.loyaltyTransactions.storeId, input.storeId),
        eq(s.loyaltyTransactions.type, 'earn'),
        eq(s.loyaltyTransactions.referenceType, 'order'),
        eq(s.loyaltyTransactions.referenceId, input.orderId),
      )).limit(1);
    if (dup) return { earned: 0, duplicate: true };

    const account = await this.getOrCreateAccount(input.storeId, input.customerId);
    const expiresAt = rules.pointsExpiryMonths > 0
      ? (() => { const e = new Date(); e.setMonth(e.getMonth() + rules.pointsExpiryMonths); return e; })()
      : null;

    try {
      await this.db.transaction(async (tx) => {
        const [acc] = await tx.select().from(s.loyaltyAccounts)
          .where(eq(s.loyaltyAccounts.id, account.id)).limit(1);
        const before = acc.balance;
        const after = before + points;
        await tx.insert(s.loyaltyTransactions).values({
          storeId: input.storeId,
          accountId: account.id,
          customerId: input.customerId,
          type: 'earn',
          direction: 'credit',
          points,
          balanceBefore: before,
          balanceAfter: after,
          referenceType: 'order',
          referenceId: input.orderId,
          orderNumber: input.orderNumber,
          expiresAt,
          description: `Earned ${points} points from order ${input.orderNumber ?? input.orderId}`,
        });
        await tx.update(s.loyaltyAccounts).set({
          balance: after,
          lifetimeEarned: acc.lifetimeEarned + points,
          updatedAt: new Date(),
        }).where(eq(s.loyaltyAccounts.id, account.id));
      });
      // L-PR-8: fire outbound webhook (best-effort, post-commit). Re-fires
      // on every successful earn but the partial unique index guarantees
      // we do not double-credit, so duplicate earns short-circuit before
      // reaching this point and never trigger a duplicate webhook.
      await emitLoyaltyEvent(this.db, input.storeId, LOYALTY_EARNED_EVENT, {
        customerId: input.customerId,
        orderId: input.orderId,
        orderNumber: input.orderNumber ?? null,
        points,
        expiresAt: expiresAt?.toISOString() ?? null,
      });
      return { earned: points, duplicate: false };
    } catch (err) {
      // سباق: انتهك الفهرس الجزئي → كُسب بالفعل لهذا الطلب
      if (isUniqueViolation(err)) return { earned: 0, duplicate: true };
      throw err;
    }
  }

  /** عاين الاستبدال المسموح دون خصم (للواجهة قبل الدفع) */
  async previewRedemption(input: {
    storeId: number; customerId: number; requestedPoints: number; orderTotal: number;
  }): Promise<RedeemResult> {
    const rules = await this.getRules(input.storeId);
    const available = await this.getBalance(input.storeId, input.customerId);
    return computeRedemption(rules, {
      requestedPoints: input.requestedPoints,
      availablePoints: available,
      orderTotal: input.orderTotal,
    });
  }

  /**
   * استبدل نقاطاً مقابل خصم على طلب. يعيد الحساب داخل المعاملة من رصيد محدّث
   * لتفادي الإفراط عند السباق. يُرجع القيمة المخصومة (ر.س).
   */
  async redeem(input: {
    storeId: number; customerId: number; requestedPoints: number; orderTotal: number;
    referenceId?: number; orderNumber?: string;
  }): Promise<RedeemResult> {
    const rules = await this.getRules(input.storeId);
    const account = await this.getOrCreateAccount(input.storeId, input.customerId);

    let result: RedeemResult = { points: 0, value: 0, reason: 'disabled' };
    await this.db.transaction(async (tx) => {
      const [acc] = await tx.select().from(s.loyaltyAccounts)
        .where(eq(s.loyaltyAccounts.id, account.id)).limit(1);
      result = computeRedemption(rules, {
        requestedPoints: input.requestedPoints,
        availablePoints: acc.balance,
        orderTotal: input.orderTotal,
      });
      if (result.points <= 0) return;

      const before = acc.balance;
      const after = before - result.points;
      await tx.insert(s.loyaltyTransactions).values({
        storeId: input.storeId,
        accountId: account.id,
        customerId: input.customerId,
        type: 'redeem',
        direction: 'debit',
        points: result.points,
        balanceBefore: before,
        balanceAfter: after,
        referenceType: input.referenceId ? 'order' : undefined,
        referenceId: input.referenceId,
        orderNumber: input.orderNumber,
        description: `Redeemed ${result.points} points (${result.value} SAR)`,
      });
      await tx.update(s.loyaltyAccounts).set({
        balance: after,
        lifetimeRedeemed: acc.lifetimeRedeemed + result.points,
        updatedAt: new Date(),
      }).where(eq(s.loyaltyAccounts.id, account.id));
    });
    // L-PR-8: fire outbound webhook (best-effort, post-commit). We emit
    // only when a real redemption happened (points > 0); failed previews
    // (below_min, insufficient_balance) don't generate an event.
    if (result.points > 0) {
      await emitLoyaltyEvent(this.db, input.storeId, LOYALTY_REDEEMED_EVENT, {
        customerId: input.customerId,
        orderId: input.referenceId ?? null,
        orderNumber: input.orderNumber ?? null,
        points: result.points,
        value: result.value,
      });
    }
    return result;
  }

  /**
   * كنس نقاط منتهية لحساب واحد (FIFO): يستهلك المخصوم سابقاً من أقدم الدفعات،
   * فما تبقّى من دفعات انتهت صلاحيتها يُخصم كـ expire. آمن للتكرار.
   * @returns النقاط المنتهية المخصومة الآن.
   */
  async expireAccount(storeId: number, customerId: number, asOf: Date = new Date()): Promise<number> {
    const rules = await this.getRules(storeId);
    if (rules.pointsExpiryMonths <= 0) return 0;

    const account = await this.getOrCreateAccount(storeId, customerId);

    let expired = 0;
    await this.db.transaction(async (tx) => {
      const txns = await tx.select().from(s.loyaltyTransactions)
        .where(eq(s.loyaltyTransactions.accountId, account.id))
        .orderBy(s.loyaltyTransactions.createdAt);

      // دفعات الكسب (أقدم أولاً) + إجمالي المخصوم سابقاً (redeem/expire/revoke)
      const earnLots: PointsLot[] = [];
      let consumed = 0;
      for (const t of txns) {
        if (t.type === 'earn') earnLots.push({ points: t.points, earnedAt: t.expiresAt ? backMonths(t.expiresAt, rules.pointsExpiryMonths) : t.createdAt });
        else if (t.direction === 'debit') consumed += t.points;
      }

      // استهلك المخصوم من أقدم الدفعات (FIFO) → يتبقّى دفعات حيّة
      const remaining = consumeFifo(earnLots, consumed);
      const { expiredPoints } = computeExpiry(rules, remaining, asOf);
      if (expiredPoints <= 0) return;

      const [acc] = await tx.select().from(s.loyaltyAccounts)
        .where(eq(s.loyaltyAccounts.id, account.id)).limit(1);
      const before = acc.balance;
      const toExpire = Math.min(expiredPoints, before); // لا يتجاوز الرصيد أبداً
      if (toExpire <= 0) return;
      const after = before - toExpire;

      await tx.insert(s.loyaltyTransactions).values({
        storeId, accountId: account.id, customerId,
        type: 'expire', direction: 'debit', points: toExpire,
        balanceBefore: before, balanceAfter: after,
        description: `Expired ${toExpire} points`,
      });
      await tx.update(s.loyaltyAccounts).set({
        balance: after,
        lifetimeExpired: acc.lifetimeExpired + toExpire,
        updatedAt: new Date(),
      }).where(eq(s.loyaltyAccounts.id, account.id));
      expired = toExpire;
    });
    // L-PR-8: fire outbound webhook (best-effort, post-commit). Only
    // when an actual expiry happened — keeps cron sweeps idle quiet.
    if (expired > 0) {
      await emitLoyaltyEvent(this.db, storeId, LOYALTY_EXPIRED_EVENT, {
        customerId,
        points: expired,
        expiredAt: asOf.toISOString(),
      });
    }
    return expired;
  }

  /**
   * L-PR-7 — Sweep all accounts in a store whose oldest earn-lots have
   * passed their expiry date. Used by the daily `loyalty.expiry` cron in
   * apps/api/src/worker.ts. Safe to retry: each per-account call is
   * idempotent (FIFO consumption + `Math.min(expiredPoints, before)`).
   *
   * Walks accounts with `balance > 0` to skip already-empty rows. Returns
   * a summary { accounts, totalExpired } so the scheduler can log effort.
   */
  async expireAllAccounts(storeId: number, asOf: Date = new Date()): Promise<{
    accounts: number; totalExpired: number;
  }> {
    const rules = await this.getRules(storeId);
    if (rules.pointsExpiryMonths <= 0) return { accounts: 0, totalExpired: 0 };

    const accounts = await this.db.select({
      customerId: s.loyaltyAccounts.customerId,
    }).from(s.loyaltyAccounts)
      .where(and(
        eq(s.loyaltyAccounts.storeId, storeId),
        gt(s.loyaltyAccounts.balance, 0),
      ));

    let totalExpired = 0;
    for (const acc of accounts) {
      try {
        const expired = await this.expireAccount(storeId, acc.customerId, asOf);
        totalExpired += expired;
      } catch (err) {
        // Per-account failures must not abort the sweep — log and continue
        // so a single bad row doesn't block the rest of the merchant base.
        console.error(`[loyalty.expiry] account ${acc.customerId} failed:`, (err as Error).message);
      }
    }
    return { accounts: accounts.length, totalExpired };
  }

  /** آخر حركات العميل (للوحة العميل) */
  async listTransactions(storeId: number, customerId: number, limit = 50) {
    const account = await this.getOrCreateAccount(storeId, customerId);
    return this.db.select().from(s.loyaltyTransactions)
      .where(eq(s.loyaltyTransactions.accountId, account.id))
      .orderBy(desc(s.loyaltyTransactions.createdAt))
      .limit(limit);
  }

  /**
   * صفحات الـ ledger للعميل (cursor-based). الـ cursor هو آخر `id` رأيناه؛
   * بما أن الـ id تصاعدي والترتيب نزولي بـ createdAt+id فالـ keyset stable.
   * يُرجع `items` + `nextCursor` (أو null عند انتهاء البيانات).
   */
  async listTransactionsPaginated(
    storeId: number,
    customerId: number,
    opts: { cursor?: number; limit?: number } = {},
  ): Promise<{ items: (typeof s.loyaltyTransactions.$inferSelect)[]; nextCursor: number | null }> {
    const limit = Math.min(Math.max(1, opts.limit ?? 50), 100);
    const account = await this.getOrCreateAccount(storeId, customerId);
    const whereExpr = opts.cursor
      ? and(
        eq(s.loyaltyTransactions.accountId, account.id),
        lt(s.loyaltyTransactions.id, opts.cursor),
      )
      : eq(s.loyaltyTransactions.accountId, account.id);
    const rows = await this.db.select().from(s.loyaltyTransactions)
      .where(whereExpr)
      .orderBy(desc(s.loyaltyTransactions.id))
      .limit(limit + 1);
    const items = rows.slice(0, limit);
    const nextCursor = rows.length > limit ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  /** القيمة النقدية لرصيد العميل الحالي (ر.س) */
  async balanceValue(storeId: number, customerId: number): Promise<number> {
    const rules = await this.getRules(storeId);
    const balance = await this.getBalance(storeId, customerId);
    return pointsToValue(rules, balance);
  }

  /**
   * تعديل يدوي (admin) — يضيف نقاطاً كرصيد `type='adjust'`.
   * لا يستخدم الفهرس الجزئي للـ earn-on-order؛ كل إدخال يمكن تكراره
   * فالمسؤولية على المستدعي لاستخدام Idempotency-Key على مستوى الـ HTTP.
   * يُرجع النقاط المضافة + الرصيد الجديد.
   */
  async adjustPoints(input: {
    storeId: number; customerId: number; points: number; reason: string; actorUserId?: number;
  }): Promise<{ points: number; balance: number; reason?: 'rules_disabled' | 'invalid_points' }> {
    const rules = await this.getRules(input.storeId);
    if (!rules.enabled) return { points: 0, balance: 0, reason: 'rules_disabled' };
    const points = Math.floor(input.points);
    if (!Number.isFinite(points) || points <= 0) return { points: 0, balance: 0, reason: 'invalid_points' };

    const account = await this.getOrCreateAccount(input.storeId, input.customerId);

    let newBalance = 0;
    await this.db.transaction(async (tx) => {
      const [acc] = await tx.select().from(s.loyaltyAccounts)
        .where(eq(s.loyaltyAccounts.id, account.id)).limit(1);
      const before = acc.balance;
      const after = before + points;
      await tx.insert(s.loyaltyTransactions).values({
        storeId: input.storeId,
        accountId: account.id,
        customerId: input.customerId,
        type: 'adjust',
        direction: 'credit',
        points,
        balanceBefore: before,
        balanceAfter: after,
        description: `Manual adjust (+${points}) — ${input.reason}`,
        metadata: { actorUserId: input.actorUserId ?? null, reason: input.reason },
      });
      await tx.update(s.loyaltyAccounts).set({
        balance: after,
        lifetimeEarned: acc.lifetimeEarned + points,
        updatedAt: new Date(),
      }).where(eq(s.loyaltyAccounts.id, account.id));
      newBalance = after;
    });
    return { points, balance: newBalance };
  }

  /**
   * L-PR-9 — Read-only analytics for the merchant dashboard Loyalty tab.
   * Pure SQL aggregates; no new tables. Returns:
   *  - activeAccounts: customers with balance > 0
   *  - pointsOutstanding: sum of all account balances
   *  - redemptionRate: lifetime_redeemed / lifetime_earned (0–1)
   *  - breakageRate: lifetime_expired / lifetime_earned (0–1)
   *  - topEarners: top 10 customers by lifetime_earned
   */
  async getAnalytics(storeId: number): Promise<{
    activeAccounts: number;
    pointsOutstanding: number;
    totals: { earned: number; redeemed: number; expired: number };
    redemptionRate: number;
    breakageRate: number;
    topEarners: { customerId: number; lifetimeEarned: number; balance: number }[];
  }> {
    const [agg] = await this.db.select({
      activeAccounts: sql<string | number>`COUNT(*) FILTER (WHERE ${s.loyaltyAccounts.balance} > 0)`,
      pointsOutstanding: sql<string | number>`COALESCE(SUM(${s.loyaltyAccounts.balance}), 0)`,
      totalEarned: sql<string | number>`COALESCE(SUM(${s.loyaltyAccounts.lifetimeEarned}), 0)`,
      totalRedeemed: sql<string | number>`COALESCE(SUM(${s.loyaltyAccounts.lifetimeRedeemed}), 0)`,
      totalExpired: sql<string | number>`COALESCE(SUM(${s.loyaltyAccounts.lifetimeExpired}), 0)`,
    }).from(s.loyaltyAccounts)
      .where(eq(s.loyaltyAccounts.storeId, storeId));

    const earned = Number(agg?.totalEarned ?? 0);
    const redeemed = Number(agg?.totalRedeemed ?? 0);
    const expired = Number(agg?.totalExpired ?? 0);
    const redemptionRate = earned > 0 ? redeemed / earned : 0;
    const breakageRate = earned > 0 ? expired / earned : 0;

    const topEarners = await this.db.select({
      customerId: s.loyaltyAccounts.customerId,
      lifetimeEarned: s.loyaltyAccounts.lifetimeEarned,
      balance: s.loyaltyAccounts.balance,
    }).from(s.loyaltyAccounts)
      .where(eq(s.loyaltyAccounts.storeId, storeId))
      .orderBy(desc(s.loyaltyAccounts.lifetimeEarned))
      .limit(10);

    return {
      activeAccounts: Number(agg?.activeAccounts ?? 0),
      pointsOutstanding: Number(agg?.pointsOutstanding ?? 0),
      totals: { earned, redeemed, expired },
      redemptionRate,
      breakageRate,
      topEarners,
    };
  }
}

/** استهلك مقداراً من أقدم الدفعات (FIFO)؛ يُرجع الدفعات الحيّة المتبقية */
export function consumeFifo(lots: PointsLot[], consumed: number): PointsLot[] {
  let left = Math.max(0, consumed);
  const out: PointsLot[] = [];
  for (const lot of lots) {
    if (left <= 0) { out.push(lot); continue; }
    if (left >= lot.points) { left -= lot.points; continue; }
    out.push({ points: lot.points - left, earnedAt: lot.earnedAt });
    left = 0;
  }
  return out;
}

/** أرجِع تاريخاً للخلف بعدد أشهر (لاشتقاق earnedAt من expiresAt) */
function backMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === '23505') return true;
  const msg = (err as { message?: string })?.message ?? '';
  return /duplicate key|unique constraint/i.test(msg);
}

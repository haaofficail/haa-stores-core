import { eq, and, desc } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
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

/**
 * LoyaltyService (QA Loyalty) — يدير الإعدادات، الحسابات، والـ ledger.
 * الحساب النقي للنقاط/القيمة يتم في @haa/loyalty-core؛ هنا التخزين والذرّية.
 */
export class LoyaltyService {
  constructor(private db: DbClient = createDbClient()) {}

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
    return expired;
  }

  /** آخر حركات العميل (للوحة العميل) */
  async listTransactions(storeId: number, customerId: number, limit = 50) {
    const account = await this.getOrCreateAccount(storeId, customerId);
    return this.db.select().from(s.loyaltyTransactions)
      .where(eq(s.loyaltyTransactions.accountId, account.id))
      .orderBy(desc(s.loyaltyTransactions.createdAt))
      .limit(limit);
  }

  /** القيمة النقدية لرصيد العميل الحالي (ر.س) */
  async balanceValue(storeId: number, customerId: number): Promise<number> {
    const rules = await this.getRules(storeId);
    const balance = await this.getBalance(storeId, customerId);
    return pointsToValue(rules, balance);
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

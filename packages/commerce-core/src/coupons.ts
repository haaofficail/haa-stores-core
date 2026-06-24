import { eq, and, like, sql } from 'drizzle-orm';
import { createDbClient, type DbOrTx } from '@haa/db';
import * as s from '@haa/db/schema';
import { createCouponSchema, updateCouponSchema, applyCouponSchema } from '@haa/shared';
import { z } from 'zod';

type CreateCouponInput = z.infer<typeof createCouponSchema>;
type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
type ApplyCouponInput = z.infer<typeof applyCouponSchema>;

export class CouponsService {
  constructor(private db: DbOrTx = createDbClient()) {}

  async list(storeId: number, opts?: { search?: string; status?: string }) {
    const conditions = [eq(s.coupons.storeId, storeId)];
    if (opts?.search) {
      conditions.push(like(s.coupons.code, `%${opts.search}%`));
    }
    if (opts?.status === 'active') conditions.push(eq(s.coupons.isActive, true));
    if (opts?.status === 'inactive') conditions.push(eq(s.coupons.isActive, false));

    const items = await this.db.select()
      .from(s.coupons)
      .where(and(...conditions))
      .orderBy(s.coupons.createdAt);
    return items;
  }

  async getById(storeId: number, couponId: number) {
    const [coupon] = await this.db.select()
      .from(s.coupons)
      .where(and(eq(s.coupons.id, couponId), eq(s.coupons.storeId, storeId)))
      .limit(1);
    return coupon ?? null;
  }

  async getByCode(storeId: number, code: string) {
    const [coupon] = await this.db.select()
      .from(s.coupons)
      .where(and(eq(s.coupons.storeId, storeId), eq(s.coupons.code, code)))
      .limit(1);
    return coupon ?? null;
  }

  async create(storeId: number, input: CreateCouponInput) {
    const [coupon] = await this.db.insert(s.coupons).values({
      storeId,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      value: input.value.toString(),
      maxDiscountAmount: input.maxDiscountAmount?.toString() ?? null,
      minOrderAmount: input.minOrderAmount?.toString() ?? null,
      maxUses: input.maxUses ?? null,
      usedCount: 0,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    }).returning();
    return coupon;
  }

  async update(storeId: number, couponId: number, input: UpdateCouponInput) {
    const existing = await this.getById(storeId, couponId);
    if (!existing) return null;

    const vals: Record<string, unknown> = {};
    if (input.code !== undefined) vals.code = input.code;
    if (input.name !== undefined) vals.name = input.name;
    if (input.description !== undefined) vals.description = input.description ?? null;
    if (input.type !== undefined) vals.type = input.type;
    if (input.value !== undefined) vals.value = input.value.toString();
    if (input.maxDiscountAmount !== undefined) vals.maxDiscountAmount = input.maxDiscountAmount?.toString() ?? null;
    if (input.minOrderAmount !== undefined) vals.minOrderAmount = input.minOrderAmount?.toString() ?? null;
    if (input.maxUses !== undefined) vals.maxUses = input.maxUses;
    if (input.startsAt !== undefined) vals.startsAt = input.startsAt ? new Date(input.startsAt) : null;
    if (input.expiresAt !== undefined) vals.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (input.isActive !== undefined) vals.isActive = input.isActive;

    if (Object.keys(vals).length === 0) return existing;

    const [coupon] = await this.db.update(s.coupons).set(vals)
      .where(and(eq(s.coupons.id, couponId), eq(s.coupons.storeId, storeId)))
      .returning();
    return coupon;
  }

  async delete(storeId: number, couponId: number) {
    const existing = await this.getById(storeId, couponId);
    if (!existing) return null;

    const [coupon] = await this.db.delete(s.coupons)
      .where(and(eq(s.coupons.id, couponId), eq(s.coupons.storeId, storeId)))
      .returning();
    return coupon;
  }

  async validate(storeId: number, code: string, orderSubtotal: number) {
    const coupon = await this.getByCode(storeId, code);
    if (!coupon) return { valid: false, reason: 'كود الخصم غير صالح' } as const;
    if (!coupon.isActive) return { valid: false, reason: 'كود الخصم غير نشط' } as const;
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return { valid: false, reason: 'تم استنفاذ عدد الاستخدامات' } as const;

    const now = new Date();
    if (coupon.startsAt && new Date(coupon.startsAt) > now) return { valid: false, reason: 'كود الخصم لم يبدأ بعد' } as const;
    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return { valid: false, reason: 'كود الخصم منتهي الصلاحية' } as const;

    if (coupon.minOrderAmount && orderSubtotal < Number(coupon.minOrderAmount)) {
      return { valid: false, reason: `الحد الأدنى للطلب: ${Number(coupon.minOrderAmount).toFixed(2)} ر.س` } as const;
    }

    return { valid: true, coupon } as const;
  }

  calculateDiscount(coupon: { type: string; value: string; maxDiscountAmount?: string | null }, subtotal: number, shippingCost: number): number {
    let discount = 0;
    if (coupon.type === 'fixed') {
      discount = Math.min(Number(coupon.value), subtotal);
    } else if (coupon.type === 'percentage') {
      discount = Math.round(subtotal * Number(coupon.value) / 100 * 100) / 100;
      if (coupon.maxDiscountAmount) {
        discount = Math.min(discount, Number(coupon.maxDiscountAmount));
      }
    } else if (coupon.type === 'free_shipping') {
      discount = shippingCost;
    }
    return discount;
  }

  async apply(storeId: number, input: ApplyCouponInput) {
    const subtotal = Number(input.subtotal);
    const shippingCost = Number(input.shippingCost ?? 0);

    const validation = await this.validate(storeId, input.code, subtotal);
    if (!validation.valid) return validation;

    const discount = this.calculateDiscount(validation.coupon, subtotal, shippingCost);
    const total = Math.max(0, subtotal + shippingCost - discount);

    return { valid: true, discount, total, code: validation.coupon.code, couponId: validation.coupon.id };
  }

  /**
   * Atomically claim one use of a coupon.
   *
   * Returns `true` if the increment succeeded (i.e., the coupon was
   * still within `maxUses` at the moment of the UPDATE), and `false`
   * if the coupon was already at its cap.
   *
   * This replaces the previous non-atomic flow where `validate()` (a
   * SELECT) and `incrementUsed()` (an unconditional UPDATE) ran in
   * separate round-trips. Under concurrent checkout (two customers
   * apply the same single-use coupon at the same instant), both
   * `validate()` calls would see `usedCount < maxUses` and both
   * UPDATEs would succeed, taking `usedCount` from 0 to 2 on a
   * `maxUses=1` coupon — the coupon would have been used twice.
   *
   * The SQL below enforces the `usedCount < maxUses` check inside the
   * same row-locking UPDATE, so only one of the concurrent transactions
   * can succeed. `maxUses IS NULL` allows unlimited-use coupons to
   * continue incrementing without ceiling.
   *
   * Callers MUST check the return value and refuse the order if it's
   * `false` (the coupon ran out between validation and finalization).
   */
  async tryClaimUse(storeId: number, couponId: number): Promise<boolean> {
    const result = await this.db
      .update(s.coupons)
      .set({ usedCount: sql`${s.coupons.usedCount} + 1` })
      .where(
        and(
          eq(s.coupons.id, couponId),
          eq(s.coupons.storeId, storeId),
          sql`(${s.coupons.maxUses} IS NULL OR ${s.coupons.usedCount} < ${s.coupons.maxUses})`,
        ),
      )
      .returning({ id: s.coupons.id });
    return result.length > 0;
  }

  /**
   * @deprecated Use {@link tryClaimUse} instead. This method does not
   * enforce the `usedCount < maxUses` invariant atomically, so two
   * concurrent callers can both succeed and take a single-use coupon
   * past its cap. Kept for backward compatibility with non-checkout
   * call sites (admin manual increment); checkout MUST use
   * `tryClaimUse` and refuse the order on a `false` return.
   */
  async incrementUsed(storeId: number, couponId: number) {
    await this.db.update(s.coupons)
      .set({ usedCount: sql`${s.coupons.usedCount} + 1` })
      .where(and(eq(s.coupons.id, couponId), eq(s.coupons.storeId, storeId)));
  }
}

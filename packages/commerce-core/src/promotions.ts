import { eq, and, like, lte, gte } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { createPromotionSchema, updatePromotionSchema } from '@haa/shared';
import { z } from 'zod';

type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;

export class PromotionsService {
  constructor(private db: DbClient = createDbClient()) {}

  async list(storeId: number, opts?: { search?: string; status?: string }) {
    const conditions = [eq(s.promotions.storeId, storeId)];
    if (opts?.search) {
      conditions.push(like(s.promotions.name, `%${opts.search}%`));
    }
    if (opts?.status === 'active') conditions.push(eq(s.promotions.isActive, true));
    if (opts?.status === 'inactive') conditions.push(eq(s.promotions.isActive, false));

    const items = await this.db.select()
      .from(s.promotions)
      .where(and(...conditions))
      .orderBy(s.promotions.createdAt);
    return items;
  }

  async getActiveForStore(storeId: number) {
    const now = new Date();
    return this.db.select()
      .from(s.promotions)
      .where(and(
        eq(s.promotions.storeId, storeId),
        eq(s.promotions.isActive, true),
        lte(s.promotions.startsAt, now),
        gte(s.promotions.endsAt, now),
      ));
  }

  async getById(storeId: number, promotionId: number) {
    const [promotion] = await this.db.select()
      .from(s.promotions)
      .where(and(eq(s.promotions.id, promotionId), eq(s.promotions.storeId, storeId)))
      .limit(1);
    return promotion ?? null;
  }

  async create(storeId: number, input: CreatePromotionInput) {
    const [promotion] = await this.db.insert(s.promotions).values({
      storeId,
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      value: input.value.toString(),
      minOrderAmount: input.minOrderAmount?.toString() ?? null,
      maxDiscountAmount: input.maxDiscountAmount?.toString() ?? null,
      appliesTo: input.appliesTo ?? null,
      appliesToId: input.appliesToId ?? null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
    }).returning();
    return promotion;
  }

  async update(storeId: number, promotionId: number, input: UpdatePromotionInput) {
    const existing = await this.getById(storeId, promotionId);
    if (!existing) return null;

    const vals: Record<string, unknown> = {};
    if (input.name !== undefined) vals.name = input.name;
    if (input.description !== undefined) vals.description = input.description ?? null;
    if (input.type !== undefined) vals.type = input.type;
    if (input.value !== undefined) vals.value = input.value.toString();
    if (input.minOrderAmount !== undefined) vals.minOrderAmount = input.minOrderAmount?.toString() ?? null;
    if (input.maxDiscountAmount !== undefined) vals.maxDiscountAmount = input.maxDiscountAmount?.toString() ?? null;
    if (input.appliesTo !== undefined) vals.appliesTo = input.appliesTo ?? null;
    if (input.appliesToId !== undefined) vals.appliesToId = input.appliesToId ?? null;
    if (input.startsAt !== undefined) vals.startsAt = new Date(input.startsAt);
    if (input.endsAt !== undefined) vals.endsAt = new Date(input.endsAt);
    if (input.isActive !== undefined) vals.isActive = input.isActive;

    if (Object.keys(vals).length === 0) return existing;

    const [promotion] = await this.db.update(s.promotions).set(vals)
      .where(and(eq(s.promotions.id, promotionId), eq(s.promotions.storeId, storeId)))
      .returning();
    return promotion;
  }

  async delete(storeId: number, promotionId: number) {
    const existing = await this.getById(storeId, promotionId);
    if (!existing) return null;

    const [promotion] = await this.db.delete(s.promotions)
      .where(and(eq(s.promotions.id, promotionId), eq(s.promotions.storeId, storeId)))
      .returning();
    return promotion;
  }

  async validate(storeId: number, promotionId: number, subtotal: number) {
    const promotion = await this.getById(storeId, promotionId);
    if (!promotion) return { valid: false, reason: 'Promotion not found' } as const;
    if (!promotion.isActive) return { valid: false, reason: 'Promotion is not active' } as const;

    const now = new Date();
    if (new Date(promotion.startsAt) > now) return { valid: false, reason: 'Promotion has not started yet' } as const;
    if (new Date(promotion.endsAt) < now) return { valid: false, reason: 'Promotion has expired' } as const;

    if (promotion.minOrderAmount && subtotal < Number(promotion.minOrderAmount)) {
      return { valid: false, reason: `Minimum order amount: ${Number(promotion.minOrderAmount).toFixed(2)}` } as const;
    }

    return { valid: true, promotion } as const;
  }

  calculateDiscount(promotion: { type: string; value: string; maxDiscountAmount?: string | null }, subtotal: number, shippingCost: number): number {
    let discount = 0;
    if (promotion.type === 'fixed') {
      discount = Math.min(Number(promotion.value), subtotal);
    } else if (promotion.type === 'percentage') {
      discount = Math.round(subtotal * Number(promotion.value) / 100 * 100) / 100;
      if (promotion.maxDiscountAmount) {
        discount = Math.min(discount, Number(promotion.maxDiscountAmount));
      }
    } else if (promotion.type === 'free_shipping') {
      discount = shippingCost;
    }
    return discount;
  }
}

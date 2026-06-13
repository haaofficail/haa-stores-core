import { z } from 'zod';

export const createPromotionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['percentage', 'fixed', 'buy_x_get_y', 'free_shipping']),
  value: z.coerce.number().positive(),
  minOrderAmount: z.coerce.number().nonnegative().optional(),
  maxDiscountAmount: z.coerce.number().positive().optional(),
  appliesTo: z.enum(['all', 'category', 'product']).optional(),
  appliesToId: z.coerce.number().int().positive().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
});

export const updatePromotionSchema = createPromotionSchema.partial().extend({
  isActive: z.boolean().optional(),
});

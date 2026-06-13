import { z } from 'zod';

export const createCouponSchema = z.object({
  code: z.string().min(1).max(50).transform(v => v.toUpperCase()),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['fixed', 'percentage', 'free_shipping']),
  value: z.coerce.number().positive(),
  maxDiscountAmount: z.coerce.number().positive().optional(),
  minOrderAmount: z.coerce.number().nonnegative().optional(),
  maxUses: z.coerce.number().int().positive().optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const updateCouponSchema = createCouponSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(50),
  subtotal: z.coerce.number().nonnegative(),
  shippingCost: z.coerce.number().nonnegative().optional(),
});

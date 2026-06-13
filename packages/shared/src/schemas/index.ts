import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  phone: z.string().optional(),
  storeName: z.string().min(1).max(100),
  storeSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const idempotencyKeySchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export { createProductSchema, updateProductSchema, createCategorySchema } from './products.js';
export { createCheckoutSessionSchema, updateOrderStatusSchema, updateShipmentStatusSchema, ALLOWED_PAYMENT_METHODS } from './orders.js';
export { createShippingMethodSchema, createShippingZoneSchema, createShippingRateSchema } from './shipping.js';
export { createCouponSchema, updateCouponSchema, applyCouponSchema } from './coupons.js';
export { createPromotionSchema, updatePromotionSchema } from './promotions.js';
